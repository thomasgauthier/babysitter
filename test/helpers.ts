import {
  createAgentSession,
  DefaultResourceLoader,
  SessionManager,
  SettingsManager,
  type AgentSession,
  type ExtensionFactory,
} from "@mariozechner/pi-coding-agent";

export async function createTestSession(
  extensionFactories: ExtensionFactory[],
): Promise<AgentSession> {
  const loader = new DefaultResourceLoader({
    extensionFactories,
  });

  await loader.reload();

  const { session } = await createAgentSession({
    resourceLoader: loader,
    sessionManager: SessionManager.inMemory(),
    settingsManager: SettingsManager.inMemory({
      compaction: { enabled: false },
    }),
  });

  return session;
}
