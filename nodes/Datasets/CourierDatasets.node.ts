import {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class CourierDatasets implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Courier Datasets',
		name: 'courierDatasets',
		icon: 'file:recursion_logo.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Select existing datasets or create and populate new ones',
		defaults: {
			name: 'Courier Datasets',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'courierApi',
				required: true,
			},
		],
		properties: [
			// ----------------------------------
			// Operation: Select vs Create
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Select Dataset',
						value: 'selectDataset',
						action: 'Select existing dataset',
					},
					{
						name: 'Create Dataset',
						value: 'createDataset',
						action: 'Create a new dataset and populate it',
					},
				],
				default: 'selectDataset',
			},

			// ----------------------------------
			// MODE 1: Select Dataset
			// ----------------------------------
			{
				displayName: 'Dataset Name or ID',
				name: 'datasetId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getDatasets',
				},
				default: '',
				displayOptions: {
					show: {
						operation: ['selectDataset'],
					},
				},
				required: true,
				description: 'Choose from the list of datasets available to your account. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},

			// ----------------------------------
			// MODE 2: Create Dataset
			// ----------------------------------
			{
				displayName: 'Dataset Name',
				name: 'datasetName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['createDataset'],
					},
				},
				description: 'The name of the new dataset',
			},
			{
				displayName: 'Dataset Type',
				name: 'datasetType',
				type: 'options',
				options: [
					{
						name: 'Conversation Dataset',
						value: 'conversation',
					},
				],
				default: 'conversation',
				required: true,
				displayOptions: {
					show: {
						operation: ['createDataset'],
					},
				},
			},

			// The "Friendly JSON" builder (FixedCollection)
			{
				displayName: 'Conversation Content',
				name: 'conversationUi',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						operation: ['createDataset'],
						datasetType: ['conversation'],
					},
				},
				default: {},
				placeholder: 'Add Message Pair',
				options: [
					{
						name: 'messages',
						displayName: 'Message',
						values: [
							{
								displayName: 'Role',
								name: 'role',
								type: 'options',
								options: [
									{ name: 'System', value: 'system' },
									{ name: 'User', value: 'user' },
									{ name: 'Assistant', value: 'assistant' },
								],
								default: 'user',
							},
							{
								displayName: 'Content',
								name: 'content',
								type: 'string',
								typeOptions: {
									rows: 3,
								},
								default: '',
							},
						],
					},
				],
				description: 'Add role/content pairs to build the conversation',
			},
		],
		usableAsTool: true,
	};

	// ----------------------------------
	// The Dynamic Dropdown Logic
	// ----------------------------------
	methods = {
		loadOptions: {
			async getDatasets(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				// 1. Get Base URL
				const credentials = await this.getCredentials('courierApi');
				let baseUrl = credentials.baseUrl as string;
				if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

				// 2. Fetch the list from your API
				// [MANUAL INPUT]: Make sure this URL path is correct for GET requests
				const responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'courierApi', {
					method: 'GET',
					url: `${baseUrl}/get-courier-models-for-user/`,
					json: true,
				});

				// 3. Map the backend response to n8n Dropdown format
				const returnData: INodePropertyOptions[] = [];

				// [IMPORTANT]: If your API wraps the list (e.g. { "data": [...] }),
				// change this to `const items = responseData.data as IDataObject[];`
				const items = responseData as IDataObject[];

				for (const item of items) {
					returnData.push({
						name: item.name as string,
						value: item.dataset_id as string, // Using dataset_id as the value passed along
					});
				}

				return returnData;
			},
		},
	};

	// ----------------------------------
	// The Execution Logic
	// ----------------------------------
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('courierApi');
		let baseUrl = credentials.baseUrl as string;
		if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				// --- OPTION 1: SELECT DATASET ---
				if (operation === 'selectDataset') {
					const datasetId = this.getNodeParameter('datasetId', i) as string;

					// Just pass the selected ID through
					returnData.push({
						json: {
							dataset_id: datasetId,
							action: 'selected',
						},
					});
				}

				// --- OPTION 2: CREATE DATASET ---
				if (operation === 'createDataset') {
					const name = this.getNodeParameter('datasetName', i) as string;
					// const type = this.getNodeParameter('datasetType', i) as string;

					// Retrieve the UI data
					const conversationUi = this.getNodeParameter('conversationUi', i) as IDataObject;
					const messagesList = (conversationUi.messages as IDataObject[]) || [];

					// -------------------------------------------------
					// STEP 1: Create the Dataset Container
					// -------------------------------------------------
					const createOptions: IHttpRequestOptions = {
						method: 'POST',
						// [MANUAL INPUT]: Verify this endpoint path
						url: `${baseUrl}/create-courier-dataset/`,
						body: {
							name: name,
						},
						json: true,
					};

					const createResponse = await this.helpers.httpRequestWithAuthentication.call(this, 'courierApi', createOptions);

					// [CORRECTION]: Accessing 'dataset_id' from the response
					const newDatasetId = createResponse.dataset_id;

					// -------------------------------------------------
					// STEP 2: Populate the Dataset
					// -------------------------------------------------

					// Format the data: a json object named 'conversation' containing the array
					const conversationBody = {
						conversation: messagesList.map(msg => ({
							role: msg.role,
							content: msg.content
						}))
					};

					const populateOptions: IHttpRequestOptions = {
						method: 'POST',
						// [MANUAL INPUT]: Verify this endpoint path using the new ID
						url: `${baseUrl}/create-courier-conversation/`,
						body: {
							courier_dataset: name,
							conversation: conversationBody
						},
						json: true,
					};

					const populateResponse = await this.helpers.httpRequestWithAuthentication.call(this, 'courierApi', populateOptions);

					// Return combined data
					returnData.push({
						json: {
							dataset_id: newDatasetId,
							name: name,
							items_added: messagesList.length,
							create_response: createResponse,
							populate_response: populateResponse
						},
					});
				}

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