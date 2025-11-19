import  { INodeType, INodeTypeDescription, NodeConnectionTypes } from 'n8n-workflow';

export class Datasets implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Courier Datasets',
		name: 'Courier Datasets',
		icon: { light: 'file:recursion_logo_light.svg', dark: 'file:recursion_logo_dark.svg' },
		group: ['input'],
		version: 1,
		description: 'Used to implement Courier Datasets into your workflow.',
		defaults: {
			name: 'Courier Datasets',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		properties: [
			// Node properties which the user gets displayed and
			// can change on the node.
			{
				displayName: 'My String',
				name: 'myString',
				type: 'string',
				default: '',
				placeholder: 'Placeholder value',
				description: 'The description text',
			},
		],
	};

}