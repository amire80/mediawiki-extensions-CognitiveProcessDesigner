<?php

namespace CognitiveProcessDesigner\Util;

use CognitiveProcessDesigner\Content\CognitiveProcessDesignerContent;
use CognitiveProcessDesigner\Exceptions\CpdInvalidNamespaceException;
use CognitiveProcessDesigner\HookHandler\AddDescriptionPageDiagramNavigationLinks;
use CognitiveProcessDesigner\HookHandler\BpmnTag;
use CommentStoreComment;
use Config;
use ContentHandler;
use DOMDocument;
use File;
use MediaWiki\Linker\LinkRenderer;
use MediaWiki\Page\PageReference;
use MediaWiki\Page\WikiPageFactory;
use MediaWiki\Revision\SlotRecord;
use Message;
use MWContentSerializationException;
use MWException;
use OutputPage;
use ParserOutput;
use RepoGroup;
use Title;
use TitleFactory;
use User;
use Wikimedia\Rdbms\ILoadBalancer;
use WikiPage;

class CpdDiagramPageUtil {
	/** @var TitleFactory */
	private TitleFactory $titleFactory;

	/** @var Config */
	private Config $config;

	/** @var WikiPageFactory */
	private WikiPageFactory $wikiPageFactory;

	/** @var RepoGroup */
	private RepoGroup $repoGroup;

	/** @var ILoadBalancer */
	private ILoadBalancer $loadBalancer;

	/** @var LinkRenderer */
	private LinkRenderer $linkRenderer;

	/**
	 * @param TitleFactory $titleFactory
	 * @param WikiPageFactory $wikiPageFactory
	 * @param RepoGroup $repoGroup
	 * @param Config $config
	 * @param ILoadBalancer $loadBalancer
	 * @param LinkRenderer $linkRenderer
	 */
	public function __construct(
		TitleFactory $titleFactory,
		WikiPageFactory $wikiPageFactory,
		RepoGroup $repoGroup,
		Config $config,
		ILoadBalancer $loadBalancer,
		LinkRenderer $linkRenderer
	) {
		$this->titleFactory = $titleFactory;
		$this->config = $config;
		$this->wikiPageFactory = $wikiPageFactory;
		$this->repoGroup = $repoGroup;
		$this->loadBalancer = $loadBalancer;
		$this->linkRenderer = $linkRenderer;
	}

	/**
	 * @param string $process
	 *
	 * @return WikiPage
	 */
	public function getDiagramPage( string $process ): WikiPage {
		return $this->wikiPageFactory->newFromTitle( Title::newFromText( $process, NS_PROCESS ) );
	}

	/**
	 * @param PageReference $title
	 *
	 * @return string
	 * @throws CpdInvalidNamespaceException
	 */
	public static function getProcessFromTitle( PageReference $title ): string {
		if ( $title->getNamespace() !== NS_PROCESS ) {
			throw new CpdInvalidNamespaceException( 'Page not in CPD namespace' );
		}

		return explode( '/', $title->getText() )[0];
	}

	/**
	 * @param PageReference $title
	 *
	 * @return array
	 * @throws CpdInvalidNamespaceException
	 */
	public static function getLanesFromTitle( PageReference $title ): array {
		if ( $title->getNamespace() !== NS_PROCESS ) {
			throw new CpdInvalidNamespaceException( 'Page not in CPD namespace' );
		}

		$lanes = explode( '/', $title->getBaseText() );

		// Remove process
		array_shift( $lanes );

		return $lanes;
	}

	/**
	 * @param string $process
	 * @param User $user
	 * @param string $xml
	 *
	 * @return WikiPage
	 * @throws MWContentSerializationException
	 * @throws MWException
	 */
	public function createOrUpdateDiagramPage( string $process, User $user, string $xml ): WikiPage {
		$diagramPage = $this->getDiagramPage( $process );

		$updater = $diagramPage->newPageUpdater( $user );

		$domxml = new DOMDocument( '1.0' );
		$domxml->preserveWhiteSpace = false;
		$domxml->formatOutput = true;
		$domxml->loadXML( $xml );
		$formattedXml = $domxml->saveXML();

		$content = ContentHandler::makeContent(
			$formattedXml,
			$diagramPage->getTitle(),
			CognitiveProcessDesignerContent::MODEL
		);
		$updater->setContent( SlotRecord::MAIN, $content );

		$comment = Message::newFromKey( 'cpd-api-save-diagram-update-comment' );
		$commentStore = CommentStoreComment::newUnsavedComment( $comment );
		$updater->saveRevision( $commentStore, $diagramPage->exists() ? EDIT_UPDATE : EDIT_NEW );

		return $diagramPage;
	}

	/**
	 * @param string $process
	 *
	 * @return Title
	 */
	public function getSvgFilePage( string $process ): Title {
		return $this->titleFactory->newFromText( $process . '.svg', NS_FILE );
	}

	/**
	 * @param string $process
	 *
	 * @return File|null
	 */
	public function getSvgFile( string $process ): ?File {
		$svgFilePage = $this->getSvgFilePage( $process );
		$file = $this->repoGroup->findFile( $svgFilePage );

		if ( !$file ) {
			return null;
		}

		return $file;
	}

	/**
	 * @param Title $title
	 *
	 * @return void
	 * @throws CpdInvalidNamespaceException
	 */
	public function validateNamespace( Title $title ): void {
		if ( $title->getNamespace() !== NS_PROCESS ) {
			throw new CpdInvalidNamespaceException( 'CPD page not in correct namespace' );
		}
	}

	/**
	 * @param ParserOutput|OutputPage $output
	 * @param string $process
	 *
	 * @return void
	 */
	public function setJsConfigVars( ParserOutput|OutputPage $output, string $process ): void {
		$setterFunction = $output instanceof OutputPage ? 'addJsConfigVars' : 'setJsConfigVar';

		$output->$setterFunction( 'cpdProcess', $process );
		$output->$setterFunction( 'cpdProcessNamespace', NS_PROCESS );

		if ( $this->config->has( 'CPDLaneTypes' ) ) {
			$output->$setterFunction( 'cpdLaneTypes', $this->config->get( 'CPDLaneTypes' ) );
		}
		if ( $this->config->has( 'CPDDedicatedSubpageTypes' ) ) {
			$output->$setterFunction( 'cpdDedicatedSubpageTypes', $this->config->get( 'CPDDedicatedSubpageTypes' ) );
		}
		if ( $this->config->has( 'CPDCanvasHeight' ) ) {
			$output->$setterFunction( 'cpdCanvasHeight', $this->config->get( 'CPDCanvasHeight' ) );
		}
		$output->$setterFunction(
			'cpdReturnToQueryParam',
			AddDescriptionPageDiagramNavigationLinks::RETURN_TO_QUERY_PARAM
		);
	}

	/**
	 * @param string $process
	 *
	 * @return string[]
	 */
	public function getDiagramUsageLinks( string $process ): array {
		$dbr = $this->loadBalancer->getConnection( DB_REPLICA );
		$rows = $dbr->select(
			'page_props',
			[ 'pp_page' ],
			[
				'pp_value' => $process,
				'pp_propname' => BpmnTag::PROCESS_PROP_NAME
			],
			__METHOD__
		);

		$links = [];
		foreach ( $rows as $row ) {
			$title = \MediaWiki\Title\Title::newFromID( $row->pp_page );
			$links[] = $this->linkRenderer->makeLink(
				$title,
				$title->getText()
			);
		}

		return $links;
	}
}