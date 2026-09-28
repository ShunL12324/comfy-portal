const { RuleTester } = require('eslint');
const { rules } = require('..');

const tester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe('tokens/no-literal-style-values', () => {
  tester.run('no-literal-style-values', rules['no-literal-style-values'], {
    valid: [
      'const s = { padding: t.layout.inset, gap: t.layout.related, borderRadius: t.radius.panel };',
      'const s = { margin: 0, paddingTop: -0, borderTopLeftRadius: 0 };',
      'const s = { borderWidth: StyleSheet.hairlineWidth, width: 44, height: 28, top: 12 };',
      'const s = { paddingBottom: insets.bottom + t.layout.inset, gap: t.layout.field * 2 };',
      'const s = { paddingBottom: Math.max(insets.bottom, t.layout.inset) };',
      'const s = { padding: "5%" };',
      'const s = { [key]: 12 };',
      '<View style={{ flex: 1, opacity: 1 }} />',
      'const s = { opacity: 0, height: 40, minWidth: 120 };',
      'const s = { opacity: pressed ? t.opacity.pressed : 1, height: t.height.touch };',
      { code: 'const s = { height: 44, width: 36 };', options: [{ heights: [] }] },
      { code: 'const s = { height: 40, minHeight: 48, width: 12 };', options: [{ heights: [28, 36, 44] }] },
    ],
    invalid: [
      { code: '<View style={{ padding: 12 }} />', errors: [{ messageId: 'literal' }] },
      { code: 'StyleSheet.create({ box: { borderRadius: 10, marginTop: -4 } });', errors: 2 },
      { code: 'const s = { paddingHorizontal: compact ? 8 : 12 };', errors: 2 },
      { code: 'const s = { paddingBottom: insets.bottom + 16 };', errors: 1 },
      { code: 'const s = { gap: 8 as const, rowGap: 4, columnGap: 4 };', errors: 3 },
      { code: '<List contentContainerStyle={{ paddingBottom: 20 }} />', errors: 1 },
      { code: 'const s = { "borderBottomRightRadius": 6 };', errors: 1 },
      { code: 'const s = { paddingBottom: Math.max(insets.bottom, 12), marginTop: Math.min(4, gap) };', errors: 2 },
      { code: 'const s = { padding: 8 * 2 };', errors: 2 },
      { code: '<View style={{ opacity: 0.8 }} />', errors: [{ messageId: 'literal' }] },
      { code: '<MotiView animate={{ opacity: breathing ? 0.25 : 1 }} />', errors: 1 },
      {
        code: 'const s = { height: 44, minHeight: 36, width: compact ? 28 : 40, minWidth: 44 };',
        options: [{ heights: [28, 36, 44] }],
        errors: [{ messageId: 'height' }, { messageId: 'height' }, { messageId: 'height' }, { messageId: 'height' }],
      },
    ],
  });
});

describe('tokens/no-literal-colors', () => {
  tester.run('no-literal-colors', rules['no-literal-colors'], {
    valid: [
      '<View style={{ backgroundColor: c.paper, borderColor: c.line }} />',
      '<Icon color={c.ink} fill="none" stroke="currentColor" />',
      '<Text color="primary">x</Text>',
      'const link = { href: "#add" };',
      'const s = { backgroundColor: "transparent" };',
      '<Button action="primary" color="secondary" />',
      '<Svg fill="none" stroke="currentColor" />',
    ],
    invalid: [
      { code: '<View style={{ backgroundColor: "#000000" }} />', errors: [{ messageId: 'literal' }] },
      { code: '<Icon color="#fff" />', errors: 1 },
      { code: '<Icon color={active ? "#ffffff" : c.ink} />', errors: 1 },
      { code: 'const s = { shadowColor: "rgba(0,0,0,0.3)", color: `rgb(1, 2, 3)` };', errors: 2 },
      { code: '<Switch trackColor={{ false: "#767577", true: c.ink }} />', errors: 1 },
      { code: '<Gradient colors={["#000", "#fff"]} />', errors: 2 },
      { code: 'const s = { colors: { borderColor: "#111" } };', errors: 1 },
      { code: 'const s = { backgroundColor: "black" };', errors: 1 },
      { code: '<Icon color="White" fill="hsla(0, 0%, 0%, 0.5)" />', errors: 2 },
    ],
  });
});

describe('tokens/no-raw-classes', () => {
  tester.run('no-raw-classes', rules['no-raw-classes'], {
    valid: [
      '<View className="bg-surface-raised border-stroke rounded-lg p-4 gap-2" />',
      '<Text className="text-content-secondary text-status-danger bg-paper border-ink/10" />',
      { code: '<Text className="text-typography-700 border-outline-200" />', options: [{ allowScaleSteps: true }] },
      '<View className="opacity-0 opacity-100 active:opacity-pressed data-[disabled=true]:opacity-disabled bg-media/40" />',
      {
        code: '<View className="p-2 -mx-1 gap-y-4 space-x-3 space-x-reverse mx-auto pb-safe w-12 h-3.5 max-w-7 placeholder-content pe-2" />',
        options: [{ spacingKeys: ['0', '1', '2', '3', '4'] }],
      },
      '<View className="bg-background-error bg-action data-[active=true]:opacity-pressed w-[44px] h-[28px] border-[0.5px]" />',
      'const label = "Add error-300 notes";',
      'import { Text } from "@/components/ui/text";',
    ],
    invalid: [
      { code: '<View className="rounded-[10px]" />', errors: [{ messageId: 'arbitrary' }] },
      { code: '<View className="p-[18px] -mt-[1px] gap-x-[3px]" />', errors: 3 },
      { code: '<View className="bg-[#101012] text-[#fff]" />', errors: 2 },
      { code: '<Text className="text-red-500 dark:bg-blue-500/50" />', errors: [{ messageId: 'palette' }, { messageId: 'palette' }] },
      { code: '<Text className="text-typography-600 bg-background-0 border-t-error-300" />', errors: 3 },
      { code: 'const c = cn(`p-4 ${x} data-[invalid=true]:border-error-700`);', errors: [{ messageId: 'scale' }] },
      { code: 'const style = tva({ base: "web:shadow-primary-400 !bg-error-50" });', errors: 2 },
      { code: 'const color = () => "text-success-400";', errors: 1 },
      { code: '<View className="bg-black/40 text-white" />', errors: [{ messageId: 'palette' }, { messageId: 'palette' }] },
      {
        code: '<View className="bg-primary-500 rounded-[10px] text-red-500 bg-white" />',
        options: [{ allowScaleSteps: true }],
        errors: [{ messageId: 'arbitrary' }, { messageId: 'palette' }, { messageId: 'palette' }],
      },
      {
        code: '<View className="p-3.5 -mt-7 gap-x-12 space-y-7 md:px-9" />',
        options: [{ spacingKeys: ['0', '1', '2', '3', '4'] }],
        errors: 5,
      },
      {
        code: '<View className="opacity-50 active:opacity-80 data-[disabled=true]:opacity-40 opacity-[0.3] disabled:opacity-0.4" />',
        errors: [{ messageId: 'opacity' }, { messageId: 'opacity' }, { messageId: 'opacity' }, { messageId: 'opacity' }, { messageId: 'opacity' }],
      },
    ],
  });
});

describe('tokens/no-raw-font-size', () => {
  const options = [{ textComponents: ['Copy', 'Status', 'Text', 'Heading'] }];
  tester.run('no-raw-font-size', rules['no-raw-font-size'], {
    valid: [
      { code: '<Copy size={t.type.label}>x</Copy>', options },
      { code: '<Copy>x</Copy>', options },
      { code: '<Icon size={18} />', options },
      { code: 'const s = { fontSize: t.type.body, lineHeight: lineHeight(size) };', options },
      { code: '<Text className="text-content-primary text-center font-medium leading-none" />', options },
      { code: '<Text className="text-sm text-2xs">x</Text>', options: [{ allowSizeClasses: true }] },
      { code: '<Button size="sm" />', options },
      { code: '<Copy size="body">x</Copy>', options },
    ],
    invalid: [
      { code: '<Copy size={16}>x</Copy>', options, errors: [{ messageId: 'prop' }] },
      { code: '<Status size={ready ? 19 : 13} label="x" />', options, errors: 2 },
      { code: 'const s = { fontSize: 13, lineHeight: 20 };', options, errors: [{ messageId: 'style' }, { messageId: 'style' }] },
      { code: '<Text className="text-sm md:text-2xl text-base" />', options, errors: 3 },
      { code: '<Text className="text-[13px] leading-[32px]" />', options, errors: [{ messageId: 'arbitrary' }, { messageId: 'arbitrary' }] },
      { code: '<Text className="text-2xs" />', options, errors: [{ messageId: 'className' }] },
      { code: '<Text size="sm">x</Text>', options, errors: [{ messageId: 'prop' }] },
      { code: '<Heading size="md">x</Heading>', options, errors: [{ messageId: 'prop' }] },
      { code: '<Heading size={compact ? "md" : "lg"}>x</Heading>', options, errors: 2 },
      { code: '<Text className="text-[13px] text-sm" />', options: [{ allowSizeClasses: true }], errors: [{ messageId: 'arbitrary' }] },
    ],
  });
});

describe('tokens/no-raw-icon-size', () => {
  tester.run('no-raw-icon-size', rules['no-raw-icon-size'], {
    valid: [
      "import { Check } from '@/constants/icons'; <Check size={t.icon.small} strokeWidth={iconStroke(t.icon.small)} />;",
      "import { Check } from 'lucide-react-native'; <Check size={size} />;",
      "import { Spinner } from '@/components/ui/spinner'; <Spinner size={20} />;",
      '<Action iconSize={t.icon.large} />',
      '<Icon as={Check} size="display" className="text-content-tertiary" />',
      '<InputIcon as={Search} width={t.icon.small} height={t.icon.small} />',
      'const Icon = item.icon; <Icon size={t.icon.medium} strokeWidth={iconStroke(t.icon.medium)} />;',
      '<View className="h-10 w-10" />',
      '<Box width={40} height={40} />',
    ],
    invalid: [
      {
        code: "import { Check } from '@/constants/icons'; <Check size={14} strokeWidth={1.5} />;",
        errors: [{ messageId: 'size' }, { messageId: 'stroke' }],
      },
      {
        code: "import { X as Close } from 'lucide-react-native'; <Close size={compact ? 16 : 20} strokeWidth={20 / 12} />;",
        errors: [{ messageId: 'size' }, { messageId: 'size' }, { messageId: 'stroke' }, { messageId: 'stroke' }],
      },
      { code: '<Action iconSize={20} />', errors: [{ messageId: 'size' }] },
      { code: 'const Icon = item.icon; <Icon size={18} strokeWidth={1.5} />;', errors: [{ messageId: 'size' }, { messageId: 'stroke' }] },
      { code: '<InputIcon as={Search} width={14} height={14} />', errors: [{ messageId: 'size' }, { messageId: 'size' }] },
      { code: '<ActionIcon strokeWidth={2} />', errors: [{ messageId: 'stroke' }] },
      { code: '<Svg><Path strokeWidth={1.5} /></Svg>', errors: [{ messageId: 'stroke' }] },
      {
        code: '<Icon as={Play} size="xl" className="h-10 w-10 text-on-media" />',
        errors: [{ messageId: 'className' }, { messageId: 'className' }],
      },
      {
        code: '<Icon as={Share} className={`size-4 ${active ? "text-ink" : "min-w-3.5"}`} />',
        errors: [{ messageId: 'className' }, { messageId: 'className' }],
      },
    ],
  });
});
