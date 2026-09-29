import { RotatingSpinner } from '@/components/ui/rotating-spinner';
import { View } from '@/components/ui/view';
import { Copy, Row, StateIcon, useDesign } from '@/components/ui/design-system/primitives';
import { designTokens as t } from '@/constants/design-tokens';
import { resolveTypography } from '@/components/ui/design-system/typography';
import { getToolName, isToolUIPart, type DynamicToolUIPart, type ToolUIPart, type UIMessage } from 'ai';
import { AlertCircle, Check } from '@/constants/icons';
import { MotiView } from 'moti';
import { useReducedMotion } from 'react-native-reanimated';
import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Markdown, { type RenderRules } from 'react-native-markdown-display';
import { NativeText } from '@/components/ui/text/native-text';

const markdownRules: RenderRules = {
  // Nested **_emphasis_** needs a combined face: one parent's static font must
  // not erase the other parent's bold/italic meaning when Markdown flattens it.
  text: (node, children, parents, styles, inherited = {}) => (
    <NativeText
      key={node.key}
      style={[
        inherited,
        styles.text,
        resolveTypography({
          ...inherited,
          ...(parents.some((parent) => parent.type === 'strong') ? { fontWeight: '700' } : {}),
          ...(parents.some((parent) => parent.type === 'em') ? { fontStyle: 'italic' } : {}),
        }),
      ]}
    >
      {node.content}
    </NativeText>
  ),
};

interface ChatMessageBubbleProps {
  message: UIMessage;
  renderFooter?: React.ReactNode;
}

export function ChatMessageBubble({ message, renderFooter }: ChatMessageBubbleProps) {
  const isUser = message.role === 'user';
  const c = useDesign();
  const reduced = useReducedMotion();

  // StyleSheet.create required by react-native-markdown-display API — cannot use NativeWind here
  const mdStyles = useMemo(
    () =>
      StyleSheet.create({
        body: {
          fontFamily: t.font.sans,
          color: c.ink,
          fontSize: t.type.body,
          lineHeight: t.leading.body,
        },
        heading1: {
          fontSize: t.type.section,
          lineHeight: t.leading.section,
          ...resolveTypography({ fontWeight: '500' }),
          marginTop: t.layout.related,
          marginBottom: t.layout.label,
          color: c.ink,
        },
        heading2: {
          fontSize: t.type.section,
          lineHeight: t.leading.section,
          ...resolveTypography({ fontWeight: '500' }),
          marginTop: t.layout.related,
          marginBottom: t.layout.label,
          color: c.ink,
        },
        heading3: {
          fontSize: t.type.section,
          lineHeight: t.leading.section,
          ...resolveTypography({ fontWeight: '500' }),
          marginTop: t.layout.label,
          marginBottom: t.layout.label,
          color: c.ink,
        },
        heading4: {
          fontSize: t.type.body,
          lineHeight: t.leading.body,
          ...resolveTypography({ fontWeight: '500' }),
          color: c.ink,
        },
        heading5: {
          fontSize: t.type.body,
          lineHeight: t.leading.body,
          ...resolveTypography({ fontWeight: '500' }),
          color: c.ink,
        },
        heading6: {
          fontSize: t.type.body,
          lineHeight: t.leading.body,
          ...resolveTypography({ fontWeight: '500' }),
          color: c.ink,
        },
        paragraph: {
          marginTop: 0,
          marginBottom: t.layout.related,
        },
        strong: {
          ...resolveTypography({ fontWeight: '700' }),
        },
        em: {
          ...resolveTypography({ fontStyle: 'italic' }),
        },
        s: {
          textDecorationLine: 'line-through',
        },
        link: {
          // Tint identifies links; the underline preserves a non-color cue.
          color: c.tint,
          textDecorationLine: 'underline',
        },
        blockquote: {
          backgroundColor: c.well,
          borderColor: c.line,
          borderLeftWidth: 3,
          paddingHorizontal: t.layout.related,
          paddingVertical: t.layout.label,
          marginVertical: t.layout.label,
        },
        code_inline: {
          backgroundColor: c.well,
          borderColor: c.line,
          borderWidth: 1,
          borderRadius: t.radius.small,
          paddingHorizontal: t.layout.label,
          paddingVertical: t.layout.badgeY,
          fontSize: t.type.label,
          ...resolveTypography({ fontFamily: t.font.sans }),
          lineHeight: t.leading.label,
          color: c.ink,
        },
        code_block: {
          backgroundColor: c.well,
          borderColor: c.line,
          borderWidth: 1,
          borderRadius: t.radius.small,
          padding: t.layout.related,
          fontSize: t.type.label,
          ...resolveTypography({ fontFamily: t.font.sans }),
          lineHeight: t.leading.label,
          color: c.ink,
        },
        fence: {
          backgroundColor: c.well,
          borderColor: c.line,
          borderWidth: 1,
          borderRadius: t.radius.small,
          padding: t.layout.related,
          fontSize: t.type.label,
          ...resolveTypography({ fontFamily: t.font.sans }),
          lineHeight: t.leading.label,
          color: c.ink,
        },
        bullet_list: {
          marginVertical: t.layout.label,
        },
        ordered_list: {
          marginVertical: t.layout.label,
        },
        list_item: {
          flexDirection: 'row',
          justifyContent: 'flex-start',
          marginVertical: 0,
        },
        bullet_list_icon: {
          marginLeft: t.layout.label,
          marginRight: t.layout.label,
          color: c.secondary,
        },
        bullet_list_content: {
          flex: 1,
        },
        ordered_list_icon: {
          marginLeft: t.layout.label,
          marginRight: t.layout.label,
          color: c.secondary,
        },
        ordered_list_content: {
          flex: 1,
        },
        hr: {
          backgroundColor: c.line,
          height: 1,
          marginVertical: t.layout.related,
        },
        table: {
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: t.radius.small,
          marginVertical: t.layout.label,
        },
        tr: {
          borderBottomWidth: 1,
          borderColor: c.subtle,
          flexDirection: 'row',
        },
        th: {
          flex: 1,
          padding: t.layout.label,
          ...resolveTypography({ fontWeight: '700' }),
          fontSize: t.type.label,
        },
        td: {
          flex: 1,
          padding: t.layout.label,
          fontSize: t.type.label,
        },
        image: {
          flex: 1,
          borderRadius: t.radius.small,
        },
        text: {},
        textgroup: {},
      }),
    [c],
  );

  return (
    <MotiView
      testID={`chat-message-${message.id}`}
      from={{ opacity: reduced ? 1 : 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'timing', duration: reduced ? 0 : t.motion.fast }}
      style={{ width: '100%', alignItems: isUser ? 'flex-end' : 'flex-start' }}
    >
      <View
        style={{
          width: isUser ? undefined : '100%',
          maxWidth: isUser ? '85%' : '100%',
          minWidth: 0,
          gap: t.layout.related,
        }}
      >
        {message.parts.map((part, index) => {
          if (part.type === 'text') {
            if (!part.text) return null;
            return isUser ? (
              <View
                key={index}
                style={{
                  backgroundColor: c.well,
                  borderRadius: t.radius.panel,
                  paddingHorizontal: t.layout.rowX,
                  paddingVertical: t.layout.rowY,
                }}
              >
                <Copy>{part.text}</Copy>
              </View>
            ) : (
              <View key={index} style={{ width: '100%', minWidth: 0 }}>
                <Markdown style={mdStyles} mergeStyle={false} rules={markdownRules}>
                  {part.text}
                </Markdown>
              </View>
            );
          }
          if (isToolUIPart(part)) return <ToolPartCard key={index} part={part} />;
          return null;
        })}
        {renderFooter}
      </View>
    </MotiView>
  );
}

/** Human-readable labels for the agent's tools. */
const TOOL_LABELS: Record<string, string> = {
  read_workflow: 'Reading workflow',
  update_node_input: 'Updating parameter',
  batch_update_nodes: 'Updating parameters',
  run_workflow: 'Generating',
  undo: 'Undoing',
};

/**
 * One tool invocation, rendered per lifecycle state.
 *
 * Replaces the old "Applied Changes" summary, which was built by re-parsing
 * tool arguments after the fact and could never show a before value.
 */
function ToolPartCard({ part }: { part: ToolUIPart | DynamicToolUIPart }) {
  // Our agent only registers static tools, but the type guard also admits
  // dynamic ones, which carry their name on a different field.
  const name = part.type === 'dynamic-tool' ? part.toolName : getToolName(part);
  const label = TOOL_LABELS[name] ?? name;

  const pending = part.state === 'input-streaming' || part.state === 'input-available';
  const failed = part.state === 'output-error';
  const c = useDesign();

  return (
    <View
      style={{
        width: '100%',
        minWidth: 0,
        backgroundColor: c.well,
        borderRadius: t.radius.panel,
        paddingHorizontal: t.layout.rowX,
        paddingVertical: t.layout.rowY,
        borderWidth: 1,
        borderColor: failed ? c.danger : c.line,
        gap: t.layout.label,
      }}
    >
      <Row style={{ gap: t.layout.related }}>
        {pending ? (
          <RotatingSpinner size="sm" />
        ) : (
          <StateIcon icon={failed ? AlertCircle : Check} size={t.icon.small} color={failed ? c.danger : c.muted} />
        )}
        <Copy
          size="label"
          muted={!failed}
          style={{ flex: 1, fontWeight: '500', ...(failed ? { color: c.danger } : {}) }}
        >
          {label}
        </Copy>
      </Row>

      {part.state === 'output-error' && (
        <Copy size="metadata" style={{ color: c.danger }}>
          {part.errorText}
        </Copy>
      )}

      {part.state === 'output-available' && typeof part.output === 'string' && (
        <Copy size="metadata" muted numberOfLines={6}>
          {part.output}
        </Copy>
      )}
    </View>
  );
}
