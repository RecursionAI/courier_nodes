/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { INodeType, INodeTypeDescription, ISupplyDataFunctions, SupplyData } from 'n8n-workflow';
import { ChatOpenAI } from '@langchain/openai';

export class CourierModel implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Courier Model',
		name: 'courierModel',
		icon: 'file:recursion_logo.svg',
		group: ['transform'],
		version: 1,
		description: 'The Brain: Connect this to the Model input of an AI Agent',
		defaults: {
			name: 'Courier Model',
		},
		// This tells n8n this node outputs a "Brain" object
		inputs: [],
		outputs: ['ai_languageModel'],
		credentials: [
			{
				name: 'courierApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Model Name',
				name: 'modelName',
				type: 'string',
				default: 'llama-3-8b',
				description: 'The model ID to use for chat completions',
			},
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				default: 0.7,
				typeOptions: {
					minValue: 0,
					maxValue: 1,
				},
				description: 'Controls randomness: 0 is consistent, 1 is creative',
			},
		],
	};

	// We use supplyData instead of execute because we are returning an object instance
	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('courierApi');
		const modelName = this.getNodeParameter('modelName', itemIndex) as string;
		const temperature = this.getNodeParameter('temperature', itemIndex) as number;

		// Clean the URL
		let baseUrl = credentials.baseUrl as string;
		if (baseUrl.endsWith('/')) {
			baseUrl = baseUrl.slice(0, -1);
		}
		// Ensure it has the /v1 suffix which LangChain expects for OpenAI compatible APIs
		if (!baseUrl.endsWith('/v1')) {
			baseUrl = `${baseUrl}/v1`;
		}

		// Initialize the LangChain object
		// We use ChatOpenAI because Courier uses the same API standard
		const model = new ChatOpenAI({
			openAIApiKey: 'not-needed', // Courier usually doesn't check this, but it is required by the class
			configuration: {
				baseURL: baseUrl,
			},
			modelName: modelName,
			temperature: temperature,
		});

		return {
			response: model,
		};
	}
}
