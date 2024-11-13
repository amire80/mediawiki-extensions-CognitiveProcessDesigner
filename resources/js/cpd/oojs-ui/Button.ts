
export default abstract class Button extends OO.ui.Tool {
	onUpdateState() {
	}

	setLabel( label: string ) {
		this.setTitle( label );

	}

	getTagName(): string {
		return "span";
	}
}
