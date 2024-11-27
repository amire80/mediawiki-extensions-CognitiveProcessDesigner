<?php

namespace CognitiveProcessDesigner\Data\Processes;

use CognitiveProcessDesigner\Content\CognitiveProcessDesignerContent;
use MWStake\MediaWiki\Component\DataStore\IPrimaryDataProvider;
use MWStake\MediaWiki\Component\DataStore\ReaderParams;
use stdClass;
use Wikimedia\Rdbms\ILoadBalancer;

class PrimaryDataProvider implements IPrimaryDataProvider {

	/** @var ILoadBalancer */
	private $loadBalancer;

	/**
	 * @param ILoadBalancer $loadBalancer
	 */
	public function __construct(
		ILoadBalancer $loadBalancer
	) {
		$this->loadBalancer = $loadBalancer;
	}

	/**
	 * @param ReaderParams $params
	 *
	 * @return Record[]
	 */
	public function makeData( $params ): array {
		$dbr = $this->loadBalancer->getConnection( DB_REPLICA );

		$cpdContentModel = CognitiveProcessDesignerContent::MODEL;

		$rows = $dbr->select(
			[ 'p' => 'page' ],
			[ 'p.page_title', 'p.page_namespace' ],
			[ "p.page_content_model = '$cpdContentModel'" ],
			__METHOD__
		);

		$records = [];
		foreach ( $rows as $row ) {
			$data = new stdClass();
			$data->process = $row->page_title;
			$records[] = new Record( $data );
		}

		return $records;
	}
}