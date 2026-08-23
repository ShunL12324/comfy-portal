import { OptionSelector } from '@/components/common/selectors/option-selector';
import { NumberInput } from '@/components/self-ui/number-input';
import { Badge, BadgeIcon, BadgeText } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Input, InputField } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { VStack } from '@/components/ui/vstack';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import { useNodeSchema } from '@/hooks/useNodeSchema';
import { WidgetSpec } from '@/services/node-schema';
import * as Linking from 'expo-linking';
import { AlertCircle, GitPullRequest } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import BaseNode from './base-node';
import SubItem from './sub-item';

interface UnknownNodeProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

/**
 * Fallback renderer for node types the app has no hand-written component for.
 *
 * Where the server can tell us the node's definition we render from that —
 * real dropdowns for enums, real ranges for numbers. Without it we fall back
 * to inferring a widget from the value's JS type, which cannot distinguish an
 * enum from free text and so lets users type values the server will reject.
 */
export default function UnknownNode({ node, serverId, workflowId }: UnknownNodeProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  const schema = useNodeSchema(serverId, node.class_type);

  // Linked inputs are wired to other nodes and must not be edited here.
  const displayableInputs = Object.entries(node.inputs).filter(([name, value]) => {
    if (Array.isArray(value)) return false;
    const spec = schema?.inputs[name];
    // Transport-only inputs the desktop UI hides too (e.g. MiniMax's 30
    // internal media sockets) — showing them would bury the real controls.
    if (spec && (spec.kind === 'link' || spec.hidden)) return false;
    return true;
  });

  const handleRequestSupport = () => {
    const title = encodeURIComponent(`Node Support Request: ${node.class_type}`);
    const url = `https://github.com/ShunL12324/comfy-portal/issues/new?template=node_support.yml&title=${title}&node-type=${encodeURIComponent(node.class_type)}`;
    Linking.openURL(url);
  };

  const setInput = (key: string, value: unknown) =>
    updateNodeInput(workflowId, node.id, key, value);

  /** Render from the server's definition. */
  const renderFromSpec = (key: string, value: any, spec: WidgetSpec) => {
    switch (spec.kind) {
      case 'combo': {
        const current = value == null ? '' : String(value);
        // Keep an unrecognised current value selectable rather than dropping
        // it, so a stale workflow shows what is actually set.
        const options = spec.options.includes(current) || current === ''
          ? spec.options.map((option) => ({ value: option, label: option }))
          : [
              ...spec.options.map((option) => ({ value: option, label: option })),
              { value: current, label: current, description: 'Not offered by this server' },
            ];
        return (
          <SubItem key={key} title={key}>
            <OptionSelector
              value={current}
              onChange={(next) => setInput(key, next)}
              options={options}
              title={key}
              showSearch={options.length > 8}
            />
          </SubItem>
        );
      }

      case 'int':
      case 'float': {
        const step = spec.step ?? (spec.kind === 'int' ? 1 : 0.01);
        // NumberInput rounds to decimalPlaces, which defaults to 0 — derive it
        // from the step or a float would be truncated to an integer.
        const decimalPlaces =
          spec.kind === 'int' ? 0 : (String(step).split('.')[1] ?? '').length;
        return (
          <SubItem key={key} title={key}>
            <NumberInput
              value={typeof value === 'number' ? value : (spec.default ?? 0)}
              onChange={(next) => setInput(key, Number(next))}
              minValue={spec.min}
              maxValue={spec.max}
              step={step}
              decimalPlaces={decimalPlaces}
              buttonSize={24}
              space={12}
            />
          </SubItem>
        );
      }

      case 'boolean':
        return (
          <SubItem
            key={key}
            title={key}
            rightComponent={
              <Switch
                size="sm"
                value={value === true}
                onValueChange={(next) => setInput(key, next)}
              />
            }
          />
        );

      case 'string':
        return (
          <SubItem key={key} title={key}>
            {spec.multiline ? (
              <Textarea
                size="sm"
                isReadOnly={false}
                isInvalid={false}
                isDisabled={false}
                className="w-full rounded-md border-0 bg-background-50"
              >
                <TextareaInput
                  placeholder={key}
                  value={value == null ? '' : String(value)}
                  onChangeText={(next) => setInput(key, next)}
                  className="text-sm"
                />
              </Textarea>
            ) : (
              <Input className="rounded-lg border-0 bg-background-50">
                <InputField
                  placeholder={key}
                  value={value == null ? '' : String(value)}
                  size="sm"
                  onChangeText={(next) => setInput(key, next)}
                />
              </Input>
            )}
          </SubItem>
        );

      default:
        return null;
    }
  };

  /**
   * Fallback when the server can't describe the node: infer a widget from the
   * value's JS type. An enum is indistinguishable from free text here.
   */
  const renderFromValue = (key: string, value: any) => {
    if (typeof value === 'string') {
      if (value === 'enable' || value === 'disable') {
        return (
          <SubItem key={key} title={key}>
            <Switch
              size="sm"
              value={value === 'enable'}
              onValueChange={(next) => setInput(key, next ? 'enable' : 'disable')}
            />
          </SubItem>
        );
      }
      return (
        <SubItem key={key} title={key}>
          <Input className="rounded-lg border-0 bg-background-50">
            <InputField
              placeholder={key}
              value={value}
              size="sm"
              onChangeText={(next) => setInput(key, next)}
            />
          </Input>
        </SubItem>
      );
    }

    if (typeof value === 'number') {
      return (
        <SubItem key={key} title={key}>
          <Input className="rounded-lg border-0 bg-background-50">
            <InputField
              placeholder={key}
              value={value.toString()}
              keyboardType="numeric"
              size="sm"
              onChangeText={(next) => {
                const parsed = parseFloat(next);
                if (!isNaN(parsed)) setInput(key, parsed);
              }}
            />
          </Input>
        </SubItem>
      );
    }

    if (typeof value === 'boolean') {
      return (
        <SubItem key={key} title={key}>
          <Switch size="sm" value={value} onValueChange={(next) => setInput(key, next)} />
        </SubItem>
      );
    }

    return (
      <SubItem key={key} title={key}>
        <Text className="text-typography-500">{JSON.stringify(value)}</Text>
      </SubItem>
    );
  };

  return (
    <BaseNode
      node={node}
      badges={
        <>
          <Badge size="sm" variant="solid" action="warning">
            <BadgeIcon as={AlertCircle} className="mr-1" />
            <BadgeText>Compat</BadgeText>
          </Badge>
          <TouchableOpacity
            onPress={handleRequestSupport}
            className="ml-1 flex-row items-center justify-center rounded-sm bg-background-50 px-2 py-1 active:bg-background-100"
          >
            <Icon as={GitPullRequest} size="sm" className="mr-1 text-blue-500" />
            <Text className="text-xs text-blue-500">Request Support</Text>
          </TouchableOpacity>
        </>
      }
    >
      <VStack space="md" className="w-full">
        {displayableInputs.length > 0 ? (
          displayableInputs.map(([key, value]) => {
            const spec = schema?.inputs[key];
            return spec ? renderFromSpec(key, value, spec) : renderFromValue(key, value);
          })
        ) : (
          <Text size="sm" className="text-typography-500">
            This node has no adjustable parameters.
          </Text>
        )}
      </VStack>
    </BaseNode>
  );
}
