import { expect, test, type Page } from '@playwright/test';
import { clearState, seedServer, SERVER_ID } from './fixtures/app-state';
import { installMockComfyServer } from './fixtures/comfy-server';

const ENDPOINT = 'http://127.0.0.1:18189/v1';
const transcript = [
  {
    id: 'request',
    role: 'user',
    parts: [{ type: 'text', text: 'Make the lighting softer and keep the composition.' }],
  },
  {
    id: 'answer',
    role: 'assistant',
    parts: [
      {
        type: 'text',
        text: '# Softer lighting\nUse **soft light**, keep the framing, and preserve the original subject.',
      },
      {
        type: 'tool-update_node_input',
        toolCallId: 'fixture-tool',
        state: 'output-available',
        input: {},
        output: 'Updated the prompt while preserving the composition.',
      },
      { type: 'text', text: 'The prompt has been updated.' },
    ],
  },
];

async function openChat(page: Page, theme: string, messages: unknown[] = [], configured = true) {
  await clearState(page);
  await seedServer(page);
  await installMockComfyServer(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(
    ({ theme, messages, configured, endpoint }) => {
      localStorage.setItem('theme-storage', JSON.stringify({ version: 1, state: { preference: theme } }));
      localStorage.setItem(
        'cp-workflows-v2',
        JSON.stringify({
          version: 0,
          state: {
            bindings: [{ id: 'chat-flow', assetId: 'chat-asset', serverId: 'e2e-server', addMethod: 'file' }],
            assets: [
              {
                id: 'chat-asset',
                name: 'Assistant review',
                createdAt: '2026-09-27',
                updatedAt: '2026-09-27',
                data: {
                  '1': {
                    id: '1',
                    class_type: 'CLIPTextEncode',
                    inputs: { text: 'Soft studio portrait' },
                    _meta: { title: 'Prompt' },
                  },
                },
              },
            ],
          },
        }),
      );
      if (configured)
        localStorage.setItem(
          'ai-assistant-storage',
          JSON.stringify({
            version: 1,
            state: {
              customPrompt: '',
              provider: {
                id: 'fixture-provider',
                type: 'openai-compatible',
                name: 'Fixture provider',
                endpointUrl: endpoint,
                apiKey: 'test-only-placeholder',
                modelName: 'fixture-model',
              },
            },
          }),
        );
      localStorage.setItem(
        'chat-sessions-storage',
        JSON.stringify({
          version: 1,
          state: {
            sessions: {
              'e2e-server:chat-flow': { messages, lastUpdated: 0 },
            },
          },
        }),
      );
    },
    { theme, messages, configured, endpoint: ENDPOINT },
  );
  await page.goto(`/workflow/${SERVER_ID}`);
  await page.getByRole('button', { name: 'Open Assistant review', exact: true }).click();
  await page.getByRole('tab', { name: 'Assistant', exact: true }).click();
}

for (const theme of ['dark', 'light']) {
  test(`${theme}: assistant transcript shares panel edges, keeps tool ordering and clears across tab switches`, async ({
    page,
  }) => {
    await openChat(page, theme, transcript);
    const panel = page.getByTestId('run-agent-chat');
    const paper = theme === 'dark' ? 'rgb(16, 16, 18)' : 'rgb(247, 247, 248)';
    await expect(panel).toHaveCSS('background-color', paper);
    await expect(panel).toHaveCSS('border-left-width', '0px');
    await expect(panel).toHaveCSS('border-right-width', '0px');
    await expect(page.getByTestId('chat-message-answer')).toHaveCSS('opacity', '1');
    const composer = page.getByTestId('agent-chat-composer');
    await expect(composer).toBeVisible();
    await expect
      .poll(async () => {
        const bounds = await composer.boundingBox();
        return bounds ? bounds.y + bounds.height : Infinity;
      })
      .toBeLessThanOrEqual(844);
    await expect(page.getByText('Softer lighting', { exact: true })).toBeVisible();
    await expect(page.getByText('Updating parameter', { exact: true })).toBeVisible();
    await expect(page.getByText('The prompt has been updated.', { exact: true })).toBeVisible();
    const [user, assistant] = await Promise.all([
      page.getByTestId('chat-message-request').boundingBox(),
      page.getByTestId('chat-message-answer').boundingBox(),
    ]);
    expect(assistant!.y).toBeGreaterThan(user!.y);
    expect(assistant!.x).toBeCloseTo(16, 0);
    expect(assistant!.x + assistant!.width).toBeCloseTo(374, 0);
    await page.screenshot({ path: `.expo/agent-chat-transcript-${theme}.png` });
    await page.getByRole('tab', { name: 'Nodes', exact: true }).click();
    await expect(page.getByTestId('run-node-panel')).toHaveCSS('background-color', paper);
    await page.getByRole('tab', { name: 'Assistant', exact: true }).click();
    await expect(page.getByText('The prompt has been updated.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Clear conversation', exact: true }).click();
    await expect(page.getByText('Workflow assistant', { exact: true })).toBeVisible();
    await expect(page.getByTestId('chat-message-answer')).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(
          () => JSON.parse(localStorage.getItem('chat-sessions-storage')!).state.sessions['e2e-server:chat-flow'],
        ),
      )
      .toBeUndefined();
  });

  test(`${theme}: assistant composer trims text, sends a mocked response and returns to idle`, async ({ page }) => {
    await openChat(page, theme);
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(`${ENDPOINT}/**`, async (route) => {
      await pending;
      const chunk = (delta: object, finish: string | null) =>
        `data: ${JSON.stringify({ id: 'fixture-completion', object: 'chat.completion.chunk', created: 0, model: 'fixture-model', choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`;
      await route.fulfill({
        contentType: 'text/event-stream',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body:
          chunk({ role: 'assistant', content: 'The composition is preserved.' }, null) +
          chunk({}, 'stop') +
          'data: [DONE]\n\n',
      });
    });
    const input = page.getByPlaceholder('Ask AI to adjust parameters...');
    await expect(page.getByRole('button', { name: 'Send message', exact: true })).toBeDisabled();
    await input.fill('  Make the lighting softer.  ');
    await expect(page.getByTestId('agent-chat-input-surface')).toHaveCSS(
      'border-color',
      theme === 'dark' ? 'rgb(244, 244, 245)' : 'rgb(26, 26, 30)',
    );
    await expect(input).toHaveCSS('outline-width', '0px');
    await page.screenshot({ path: `.expo/agent-chat-composer-${theme}.png` });
    await page.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Stop response', exact: true })).toBeVisible();
    await expect(input).toHaveAttribute('readonly', '');
    await expect(page.getByRole('button', { name: 'Clear conversation', exact: true })).toBeDisabled();
    release();
    await expect(page.getByText('The composition is preserved.', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send message', exact: true })).toBeDisabled();
    await expect(input).toHaveValue('');
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem('chat-sessions-storage')!).state.sessions['e2e-server:chat-flow'].messages
              .length,
        ),
      )
      .toBe(2);
  });
}

test('assistant without a provider uses the same panel and opens configuration', async ({ page }) => {
  await openChat(page, 'dark', [], false);
  await expect(page.getByTestId('run-agent-chat')).toHaveCSS('background-color', 'rgb(16, 16, 18)');
  await expect(page.getByText('Connect an AI provider', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'AI Assistant', exact: true })).toBeVisible();
});

test('assistant stop and configuration errors remain actionable', async ({ page }) => {
  await openChat(page, 'dark');
  let fail = false;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`${ENDPOINT}/**`, async (route) => {
    if (fail) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error: { message: 'Fixture credentials rejected', type: 'authentication_error', code: 'invalid_api_key' },
        }),
      });
      return;
    }
    await pending;
    await route.abort('aborted').catch(() => {});
  });
  const input = page.getByPlaceholder('Ask AI to adjust parameters...');
  await input.fill('Inspect this workflow.');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await page.getByRole('button', { name: 'Stop response', exact: true }).click();
  release();
  await expect(page.getByRole('button', { name: 'Send message', exact: true })).toBeVisible();
  await expect(input).not.toHaveAttribute('readonly');
  fail = true;
  await input.fill('Try again.');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('The provider rejected your credentials.');
  await page.getByRole('button', { name: 'Check configuration', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'AI Assistant', exact: true })).toBeVisible();
});
