import { CourierLlm } from './nodes/Llm/CourierLlm.node';
import { CourierApi } from './credentials/CourierApi.credentials';

export const nodes = [CourierLlm];

export const credentials = [CourierApi];
