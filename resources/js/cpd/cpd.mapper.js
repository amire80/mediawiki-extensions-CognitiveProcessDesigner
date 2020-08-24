( function( mw ) {
	mw.cpdMapper = {

		skipElementTypes: [ 'bpmn:Process', 'bpmn:Collaboration', 'label' ],

		mapDiagramXmlToWiki: function( xml, bpmnPath, bpmnName, elementsList ) {
			var content = '[[Category:BPMN]]\n';
			content += '{{#set:Process\n';
			content += '|id=' + bpmnPath + '\n';
			content += '|label=' + bpmnName + '\n';
			content += '|has_element=' +
				Object.keys( elementsList )
					.filter( function( k ) {
						return mw.cpdMapper.skipElementTypes
							.indexOf( elementsList[k].element.type ) === -1;
					} )
					.map( function( k ) { return bpmnPath + ':' + k; } )
					.join( ',');
			content += '|+sep=,' + '\n';
			content += '}}\n';

			content += '<div id=\"processXml\" class=\"toccolours mw-collapsible mw-collapsed\">' +
				'The following code shows the XML Serialization of the Process:' +
				'<div class=\"mw-collapsible-content\">' +
				xml +
				'</div></div>';
			return content;
		},

		mapDiagramWikiToXml: function( data ) {
			var xml = data.match(/mw-collapsible-content">[\S\s]*<\/div><\/div>/g);
			xml = xml[0]
				.replace( 'mw-collapsible-content\">', '' )
				.replace( '</div></div>', '' );
			return xml;
		},

		mapElementToWikiContent: function( bpmnEl, bpmnPath, bpmnLanes, bpmnGroups ) {
			if ( bpmnEl.element && mw.cpdMapper.skipElementTypes.indexOf( bpmnEl.element.type ) === -1 ) {
				var content = '[[Category:' + mw.cpdMapper.getElementCategory( bpmnEl ) + ']]\n';
				content += mw.cpdMapper.getElementCategoriesByGroups( bpmnEl, bpmnGroups );
				content += mw.cpdMapper.getElementSemanticProperties( bpmnEl, bpmnPath, bpmnLanes );
				return content;
			}
			return null;
		},

		getElementCategory: function( bpmnEl ) {
			var category = bpmnEl.element.type.replace('bpmn:', 'BPMN ');
			var specialType = bpmnEl.element.businessObject.eventDefinitions;
			if ( typeof specialType !== 'undefined' ) {
				specialType = specialType[0].$type.replace( 'Definition', '' );
				specialType = specialType.replace( 'bpmn:', '' );
				category = category.replace( 'Event', '' );
				category = category + specialType;
			}
			return category;
		},

		getElementSemanticProperties: function( bpmnEl, bpmnPath, bpmnLanes ) {
			var content = '{{#set:Element\n';
			content += '|id=' + bpmnPath + ':' + bpmnEl.element.id + '\n';

			/**
			 *  Shape properties
			 */
			if ( bpmnEl.element.x ) {
				content += '|xBound=' + bpmnEl.element.x + '\n';
			}
			if ( bpmnEl.element.y ) {
				content += '|yBound=' + bpmnEl.element.y + '\n';
			}
			if ( bpmnEl.element.width ) {
				content += '|width=' + bpmnEl.element.width + '\n';
			}
			if ( bpmnEl.element.height ) {
				content += '|height=' + bpmnEl.element.height + '\n';
			}

			/**
			 *  Outgoing & Incoming
			 */
			if ( bpmnEl.element.outgoing && bpmnEl.element.outgoing.length > 0 ) {
				content += '|outgoing=';
				content += bpmnEl.element.outgoing
					.map( function( v ) { return bpmnPath + ':' + v.id; } )
					.join( ',');
				content += '|+sep=,';
				content += '\n';
			}
			if ( bpmnEl.element.incoming && bpmnEl.element.incoming.length > 0 ) {
				content += '|incoming=';
				content += bpmnEl.element.incoming
					.map( function( v ) { return bpmnPath + ':' + v.id; } )
					.join( ',');
				content += '|+sep=,';
				content += '\n';
			}

			/**
			 *  Connection properties
			 */
			if ( bpmnEl.element.businessObject.sourceRef ) {
				if ( bpmnEl.element.businessObject.sourceRef.id ) {
					content += '|sourceRef=' + bpmnPath + ':' + bpmnEl.element.businessObject.sourceRef.id + '\n';
				}
				if ( bpmnEl.element.businessObject.sourceRef.length > 0 ) {
					content += '|sourceRef=';
					content += bpmnEl.element.businessObject.sourceRef
						.map( function( v ) { return bpmnPath + ':' + v.id; } )
						.join( ',');
					content += '|+sep=,';
					content += '\n';
				}
			}

			if ( bpmnEl.element.businessObject.targetRef ) {
				content += '|targetRef=' + bpmnPath + ':' + bpmnEl.element.businessObject.targetRef.id + '\n';
			}

			/**
			 * Parents & Children
			 */
			if ( bpmnEl.element.parent &&
				bpmnEl.element.parent.type !== 'bpmn:Process' &&
				bpmnEl.element.parent.type !== 'bpmn:Collaboration' )
			{
				content += '|parent=' + bpmnPath + ':' + bpmnEl.element.parent.id + '\n';
			}

			if ( bpmnEl.element.children && bpmnEl.element.children.length > 0 ) {
				content += '|children=';
				content += bpmnEl.element.children
					.map( function( v ) { return bpmnPath + ':' + v.id; } )
					.join( ',');
				content += '|+sep=,';
				content += '\n';
			}

			if ( bpmnLanes !== null ) {
				content += mw.cpdMapper.getParentLaneSemanticProperty( bpmnEl, bpmnLanes, bpmnPath );
			}

			/**
			 *  Label
			 */
			var labelSubObj = '';
			if ( bpmnEl.element.businessObject.name ) {
				content += '|label=' + bpmnEl.element.businessObject.name + '\n';
				if ( bpmnEl.element.businessObject.di.label && bpmnEl.element.businessObject.di.label.bounds ) {
					labelSubObj = '{{#subobject:PositionLabel\n';
					labelSubObj += '|x=' + bpmnEl.element.businessObject.di.label.bounds.x + '\n';
					labelSubObj += '|y=' + bpmnEl.element.businessObject.di.label.bounds.y + '\n';
					labelSubObj += '|height=' + bpmnEl.element.businessObject.di.label.bounds.height + '\n';
					labelSubObj += '|width=' + bpmnEl.element.businessObject.di.label.bounds.width + '\n';
					labelSubObj += '}}\n';
				}
			}

			content += '}}\n';

			/**
			 * SubObjects
			 */
			content += labelSubObj;

			if ( bpmnEl.element.waypoints && bpmnEl.element.waypoints.length > 0 ) {
				for ( var i = 1; i < bpmnEl.element.waypoints.length; i++ ) {
					content += '{{#subobject:WayPoint_' + i + '\n';
					content += '|x=' + bpmnEl.element.waypoints[i].x + '\n';
					content += '|y=' + bpmnEl.element.waypoints[i].y + '\n';
					content += '}}';
				}
			}

			return content;
		},

		getParentLaneSemanticProperty: function( bpmnEl, bpmnLanes, bpmnPath ) {
			var content = '';
			if ( bpmnLanes !== null ) {
				var bpmnLaneKeys = Object.keys( bpmnLanes );
				if ( bpmnLaneKeys.length > 0 ) {
					var parentLanes = [];
					for ( var i = 0; i < bpmnLaneKeys.length; i++ ) {
						if ( mw.cpdMapper.isElementBoundedByAnotherOne( bpmnEl, bpmnLanes[bpmnLaneKeys[i]] ) ) {
							parentLanes.push( bpmnPath + ':' + bpmnLanes[bpmnLaneKeys[i]].element.id );
						}
					}
					if ( parentLanes.length > 0 ) {
						content += '|parentLanes=' + parentLanes.join(',') + '|+sep=,\n';
					}
				}
			}
			return content;
		},

		getElementCategoriesByGroups: function( bpmnEl, bpmnGroups ) {
			var content = '';
			var cat = '';
			if ( bpmnGroups !== null ) {
				var bpmnGroupKeys = Object.keys( bpmnGroups );
				if ( bpmnGroupKeys.length > 0 ) {
					for ( var i = 0; i < bpmnGroupKeys.length; i++ ) {
						if ( mw.cpdMapper.isElementBoundedByAnotherOne( bpmnEl, bpmnGroups[bpmnGroupKeys[i]] ) ) {
							cat = bpmnGroups[bpmnGroupKeys[i]].element.businessObject.categoryValueRef.value;
							if ( cat !== undefined ) {
								content += '[[Category:' + cat + ']]\n';
							}
						}
					}
				}
			}
			return content;
		},

		isElementBoundedByAnotherOne: function( bpmnEl, boundaryEl) {
			if ( bpmnEl.element.id === boundaryEl.element.id ) {
				return false;
			}
			if ( !bpmnEl.element.x || !bpmnEl.element.y ) {
				return false;
			}
			if ( !boundaryEl.element.x || !boundaryEl.element.y ) {
				return false;
			}
			var points = {
				bounded: {
					x1: bpmnEl.element.x,
					x2: bpmnEl.element.x,
					y1: bpmnEl.element.y,
					y2: bpmnEl.element.y
				},
				boundary: {
					x1: boundaryEl.element.x,
					x2: boundaryEl.element.x,
					y1: boundaryEl.element.y,
					y2: boundaryEl.element.y
				}
			};

			if ( bpmnEl.element.width ) {
				points.bounded.x2 = points.bounded.x1 + bpmnEl.element.width;
			}

			if ( bpmnEl.element.height ) {
				points.bounded.y2 = points.bounded.y1 + bpmnEl.element.height;
			}

			if ( boundaryEl.element.width ) {
				points.boundary.x2 = points.boundary.x1 + boundaryEl.element.width;
			}

			if ( boundaryEl.element.height ) {
				points.boundary.y2 = points.boundary.y1 + boundaryEl.element.height;
			}

			return points.bounded.x1 >= points.boundary.x1 &&
				points.bounded.x2 <= points.boundary.x2 &&
				points.bounded.y1 >= points.boundary.y1 &&
				points.bounded.y2 <= points.boundary.y2;
		}
	};
}( mw ));