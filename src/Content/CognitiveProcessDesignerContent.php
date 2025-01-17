<?php

namespace CognitiveProcessDesigner\Content;

use TextContent;

class CognitiveProcessDesignerContent extends TextContent {

	public const MODEL = 'CPD';

	/**
	 * @param string $text
	 *
	 * @throws \MWException
	 */
	public function __construct( $text ) {
		parent::__construct( $text, self::MODEL );
	}
}
