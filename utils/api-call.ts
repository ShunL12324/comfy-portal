import { GenerationParams } from '@/types/preset';
import { ApiCallTemplateFactory } from './api-templates/template-factory';

export interface node {
  inputs: Record<string, any>;
  class_type: string;
  _meta?: {
    title?: string;
  };
}

export type ApiCall = Record<string, node>;

export function createApiCall(params: GenerationParams): ApiCall {
  const factory = ApiCallTemplateFactory.getInstance();
  const template = factory.getTemplate(params.templateType || 'default');
  return template.fillTemplate(params);
}