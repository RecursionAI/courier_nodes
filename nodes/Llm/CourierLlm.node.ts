import {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	IHttpRequestOptions,
	INodeTypeDescription,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';

export class CourierLlm implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Courier LLM',
		name: 'courierLlm',
		icon: 'file:recursion_logo.svg',
		group: ['transform'],
		version: 1,
		description: 'Interact with Courier Local or Cloud APIs',
		defaults: {
			name: 'Courier LLM',
		},
		// Fix 3: Declare that this node can be used by AI Agents
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
				displayName: 'Model Name or ID',
				name: 'model',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getModels',
				},
				default: '',
				required: true,
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			// ----------------------------------
			//         Chat Fields
			// ----------------------------------
			{
				displayName: 'System Prompt',
				name: 'systemPrompt',
				type: 'string',
				default: 'You are a helpful assistant.',
			},
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				required: true,
				description: 'The input text for the LLM',
			},
		],
	};

	methods = {
		loadOptions: {
			async getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('courierApi');
				let baseUrl = credentials.baseUrl as string;
				if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

				const responseData = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'courierApi',
					{
						method: 'GET',
						url: `${baseUrl}/get-courier-models-for-user/`,
						json: true,
					},
				);

				const items = (responseData.models as IDataObject[]) || [];
				const returnData: INodePropertyOptions[] = [];

				for (const item of items) {
					returnData.push({
						name: `${item.model_name} (Context: ${item.context_window})`,
						value: JSON.stringify({
							name: item.model_name,
							id: item.model_id,
						}),
					});
				}

				return returnData;
			},
		},
	};

	// Fix 1: IExecuteFunctions is now imported from n8n-workflow
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('courierApi');
		let baseUrl = credentials.baseUrl as string;
		if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

		for (let i = 0; i < items.length; i++) {
			try {
				const modelDataString = this.getNodeParameter('model', i) as string;
				let modelData;
				try {
					modelData = JSON.parse(modelDataString);
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
				} catch (e) {
					// Fallback if user entered a manual string expression that isn't JSON
					modelData = { name: modelDataString, id: null };
				}

				const endpoint = '/inference/';
				const prompt = this.getNodeParameter('prompt', i) as string;
				const systemPrompt = this.getNodeParameter('systemPrompt', i) as string;

				const body: IDataObject = {
					model_name: modelData.name,
					model_id: modelData.id,
					api_key: credentials.apiKey,
					temperature: 0.8,
					messages: [
						{ role: 'system', content: systemPrompt },
						{ role: 'user', content: prompt },
					],
					stream: true,
				};

				const options: IHttpRequestOptions = {
					method: 'POST',
					url: `${baseUrl}${endpoint}`,
					body: body,
					json: true,
				};

				const response = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'courierApi',
					options,
				);

				const responseData = response as IDataObject;
				const result: IDataObject = { ...responseData };

				// Map 'content' to 'output' to make it compatible with standard n8n chat handling
				if (responseData.content) {
					result.output = responseData.content;
				}

				returnData.push({
					json: result,
				});
			} catch (error) {
				if (this.continueOnFail()) {
					const errorMessage = (error as Error).message;
					returnData.push({ json: { error: errorMessage } });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
