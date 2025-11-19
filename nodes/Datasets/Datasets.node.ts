import { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class Datasets implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Courier Datasets',
		icon: 'file:recursion_logo.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Interact with Courier Local or Cloud APIs',
		defaults: {
			name: 'Courier LLM',
		},
		usableAsTool: true,
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'courierApi',
				required: true,
			},
		],
		properties: [


			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Submit Conversation Dataset',
						value: 'submit conversation',
						action: 'Submit dataset containing conversations',
					},
					{
						name: 'Submit Text Dataset',
						value: 'submit text',
						action: 'Submit dataset containing text',
					}
				],
				default: 'submit text',
			},

			q
		]
	}
}