import React, { useState, useEffect, useCallback, ChangeEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { saveUserAIConfig, getUserAIConfig, getUserAPIKey, saveUserAPIKey } from "@/utils/userAuth";
import { AIProviderSelector } from "./AIProviderSelector";
import { AIModelVersionSelector } from "./AIModelVersionSelector";
import { AICustomModelDialog } from "./AICustomModelDialog";
import { AIKeyInput } from "./AIKeyInput";
import { AIAnalysisOptions } from "./AIAnalysisOptions";
import { Check, Save, XCircle, RotateCw } from "lucide-react";
import { PredefinedProvider, CustomProvider } from "./types";
import { getProviderById } from "@/services/providers";
import { Switch } from "@/components/ui/switch";
import { UserAIConfig } from "@/types/ai";
import { getProviderConfig } from "@/services/aiProviderManager";

interface AIConnectorProps {
  // onConnect prop might become obsolete or change purpose
  // onConnect: (apiKey: string, provider: string, enabled: boolean) => void;
}

const predefinedProviders: PredefinedProvider[] = [
  { id: "openai", name: "OpenAI", versions: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"] },
  { id: "doubao", name: "豆包", versions: ["doubao-pro-32k", "doubao-pro-128k", "doubao-lite-128k"] },
  { id: "anthropic", name: "Anthropic", versions: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"] },
  { 
    id: "deepseek", 
    name: "DeepSeek", 
    versions: [
      "deepseek-chat", 
      "deepseek-coder", 
      "deepseek-reasoner", 
      "deepseek-llm-67b-chat", 
      "deepseek-coder-33b-instruct",
      "deepseek-math-7b-rl"
    ] 
  },
  { 
    id: "sbjt", 
    name: "硅基流动", 
    versions: [
      "sbjt-base", 
      "sbjt-edu", 
      "sbjt-code", 
      "sbjt-knowledge",
      "Pro/deepseek-ai/DeepSeek-V3",
      "deepseek-ai/DeepSeek-R1"
    ] 
  },
  { id: "baichuan", name: "百川大模型", versions: ["baichuan-v1", "baichuan-v2"] },
  { id: "qwen", name: "通义千问", versions: ["qwen-max", "qwen-plus", "qwen-lite"] },
  { id: "moonshot", name: "Moonshot AI", versions: ["moonshot-v1", "moonshot-pro"] },
  { id: "zhipu", name: "智谱 AI", versions: ["glm-4", "glm-3-turbo"] },
  { id: "minimax", name: "MiniMax", versions: ["abab5.5", "abab6"] },
];

const AIConnector: React.FC<AIConnectorProps> = (/*{ onConnect }*/) => {
  // Overall AI enabled state
  const [aiEnabled, setAiEnabled] = useState(true);

  // Provider selection
  const [selectedProviderId, setSelectedProviderId] = useState(predefinedProviders[0].id);
  const [selectedVersion, setSelectedVersion] = useState(predefinedProviders[0].versions[0]);
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>([]);

  // API Key state (keyed by providerId)
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [currentApiKeyInput, setCurrentApiKeyInput] = useState("");
  const [apiKeyStatuses, setApiKeyStatuses] = useState<Record<string, {
    status: 'idle' | 'saved' | 'unsaved' | 'error';
    message?: string;
  }>>({});

  // Use form for general settings like enabled toggle
  const form = useForm({
    defaultValues: {
      enabled: true,
    },
  });

  // --- Load Initial Config and Keys --- //
  const loadInitialData = useCallback(async () => {
    console.log("--- Running loadInitialData --- Time:", Date.now()); // Add entry log with timestamp
    console.log("Current customProviders dependency:", customProviders); // Log dependencies

    const savedConfig = await getUserAIConfig();
    console.log("Loaded savedConfig:", savedConfig);

    // --- MODIFIED KEY LOADING STRATEGY --- 
    const loadedKeys: Record<string, string> = {};
    const loadedStatuses: Record<string, { status: 'idle' | 'saved'; message?: string }> = {};

    let providerToSelect = predefinedProviders[0].id; // Default
    let versionToSelect = predefinedProviders[0].versions[0]; // Default
    let currentCustomProviders = customProviders; // Use state variable as base

    if (savedConfig) {
      console.log("Applying savedConfig...");
      // Set enabled state first
      setAiEnabled(savedConfig.enabled);
      form.setValue("enabled", savedConfig.enabled);
      console.log("Set aiEnabled and form value");

      // Determine the provider to select
       // Parse custom providers *before* determining the provider list
       if (savedConfig.customProviders) {
         try {
           const parsedCustom = JSON.parse(savedConfig.customProviders);
           // Check if parsed custom providers differ from current state to avoid loop
           if (JSON.stringify(parsedCustom) !== JSON.stringify(customProviders)) {
              console.log("Setting customProviders state from saved config");
              // Update local variable for immediate use, state update might be async
              currentCustomProviders = parsedCustom; 
              setCustomProviders(parsedCustom); 
           } else {
               console.log("Saved customProviders match current state, not updating.");
           }
         } catch (e) { console.error("Failed to parse custom providers"); currentCustomProviders = []; setCustomProviders([]); }
       }

       // Now determine the full provider list
       const allProviderIdsTemp = [...predefinedProviders.map(p => p.id), ...currentCustomProviders.map(p => p.id)];
       console.log("All provider IDs:", allProviderIdsTemp);

       const providerExists = allProviderIdsTemp.includes(savedConfig.provider);
       providerToSelect = providerExists ? savedConfig.provider : predefinedProviders[0].id;
       console.log(`Provider to select based on config: ${providerToSelect}`);

       // Load ONLY the key for the selected provider initially
       const selectedKey = await getUserAPIKey(providerToSelect);
       if (selectedKey) {
         console.log(`Key found for ${providerToSelect}`);
         loadedKeys[providerToSelect] = selectedKey;
         loadedStatuses[providerToSelect] = { status: 'saved' };
       } else {
         console.log(`Key NOT found for ${providerToSelect}`);
         loadedStatuses[providerToSelect] = { status: 'idle' };
       }

       // Initialize other statuses to idle (avoid fetching all keys now)
       allProviderIdsTemp.forEach(id => {
           if (!loadedStatuses[id]) {
               loadedStatuses[id] = { status: 'idle' };
           }
       });

       // Select version 
       const providerDef = predefinedProviders.find(p => p.id === providerToSelect);
       versionToSelect = providerDef?.versions.includes(savedConfig.version)
           ? savedConfig.version
           : providerDef?.versions[0] || ""; 
       console.log("Version to select:", versionToSelect);

    } else {
      // Default state if no config saved
      console.log("No saved config found, setting defaults.");
      providerToSelect = predefinedProviders[0].id;
      versionToSelect = predefinedProviders[0].versions[0];
      // Try loading default provider key
      const defaultKey = await getUserAPIKey(providerToSelect);
      if(defaultKey) {
          console.log(`Key found for default provider ${providerToSelect}`);
          loadedKeys[providerToSelect] = defaultKey;
          loadedStatuses[providerToSelect] = { status: 'saved' };
      } else {
           console.log(`Key NOT found for default provider ${providerToSelect}`);
           loadedStatuses[providerToSelect] = { status: 'idle' };
      }
      // Init other statuses
       [...predefinedProviders.map(p => p.id), ...currentCustomProviders.map(p => p.id)].forEach(id => { 
           if(!loadedStatuses[id]) loadedStatuses[id] = {status: 'idle'} 
       });
    }

    // Set state AFTER all checks and potential updates
    console.log("Setting final states...");
    setSelectedProviderId(providerToSelect);
    console.log(" Set selectedProviderId:", providerToSelect);
    setSelectedVersion(versionToSelect);
    console.log(" Set selectedVersion:", versionToSelect);
    setCurrentApiKeyInput(loadedKeys[providerToSelect] || "");
    console.log(" Set currentApiKeyInput");
    setApiKeys(loadedKeys); // Set the keys we loaded (might be just one)
    console.log(" Set apiKeys state");
    setApiKeyStatuses(loadedStatuses);
    console.log(" Set apiKeyStatuses state");

    console.log("--- loadInitialData finished --- Time:", Date.now());

  }, [form, customProviders]); // Keep dependencies, but added check for customProviders update

  useEffect(() => {
    console.log("useEffect for loadInitialData triggered. Time:", Date.now()); // Log effect trigger
    loadInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Trigger only once on mount by removing loadInitialData from deps
          // We rely on the manual comparison inside loadInitialData to prevent loops if states it depends on change later

  // --- Handle Provider/Version Change --- //
  const handleProviderChange = (newProviderId: string) => {
    console.log(`Provider changed to: ${newProviderId}`);
    setSelectedProviderId(newProviderId);
    setCurrentApiKeyInput(apiKeys[newProviderId] || "");

    // Update selected version (find default/first version for the new provider)
    const providerDef = predefinedProviders.find(p => p.id === newProviderId);
    const defaultVersion = providerDef?.versions[0] || "";
    setSelectedVersion(defaultVersion);
    console.log(`API Key input set for ${newProviderId}. Status: ${apiKeyStatuses[newProviderId]?.status}`);

    // Persist the *selected* provider/version choice immediately (without key)
    saveCurrentSelectionConfig();
  };

  const handleVersionChange = (newVersion: string) => {
     console.log(`Version changed to: ${newVersion}`);
    setSelectedVersion(newVersion);
     // Persist the *selected* provider/version choice immediately (without key)
     saveCurrentSelectionConfig();
  };

  // --- Handle API Key Input and Saving --- //
  const handleApiKeyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setCurrentApiKeyInput(newValue);
    // Update status to 'unsaved' if it was previously 'saved' or 'idle' and differs from stored key
     const currentStatus = apiKeyStatuses[selectedProviderId]?.status;
     const storedKey = apiKeys[selectedProviderId];

     if ((currentStatus === 'saved' || currentStatus === 'idle') && newValue !== storedKey) {
       setApiKeyStatuses(prev => ({ ...prev, [selectedProviderId]: { status: 'unsaved' } }));
     } else if (currentStatus === 'unsaved' && newValue === storedKey) {
         // If user reverts back to the saved key value
         setApiKeyStatuses(prev => ({ ...prev, [selectedProviderId]: { status: 'saved' } }));
     }
  };

  const handleSaveApiKey = async () => {
    if (!currentApiKeyInput) {
      toast.error(`请输入 ${selectedProviderId} 的 API 密钥`);
      setApiKeyStatuses(prev => ({ ...prev, [selectedProviderId]: { status: 'error', message: 'API Key cannot be empty' } }));
      return;
    }
    console.log(`Saving API Key for: ${selectedProviderId}`);
    try {
      await saveUserAPIKey(selectedProviderId, currentApiKeyInput);
      setApiKeys(prev => ({ ...prev, [selectedProviderId]: currentApiKeyInput }));
      setApiKeyStatuses(prev => ({ ...prev, [selectedProviderId]: { status: 'saved' } }));
      toast.success(`${selectedProviderId} API 密钥已保存`);

      // Also save the general config (provider selection, enabled state)
      saveCurrentSelectionConfig(true); // Pass true to indicate key was just saved

    } catch (error) {
      console.error(`Error saving API key for ${selectedProviderId}:`, error);
      toast.error(`保存 ${selectedProviderId} API 密钥失败`);
      setApiKeyStatuses(prev => ({ ...prev, [selectedProviderId]: { status: 'error', message: 'Failed to save' } }));
    }
  };

  // --- Save General Configuration --- //
  const saveCurrentSelectionConfig = async (keyJustSaved = false) => {
     console.log(`Saving general config. Selected provider: ${selectedProviderId}, Version: ${selectedVersion}, Enabled: ${aiEnabled}`);
    const config: UserAIConfig = {
      provider: selectedProviderId,
      version: selectedVersion,
      enabled: aiEnabled,
      lastUpdated: new Date().toISOString(),
      customProviders: JSON.stringify(customProviders),
      // Ensure all required fields from UserAIConfig are present if any
    };
    try {
      await saveUserAIConfig(config);
       if (!keyJustSaved) {
           toast.info('AI 配置偏好已更新');
       }
    } catch (error) {
      console.error("Error saving AI config:", error);
      toast.error('保存 AI 配置偏好失败');
    }
  };

   // Handle AI Enabled Toggle
   const handleEnabledChange = (checked: boolean) => {
     setAiEnabled(checked);
     form.setValue("enabled", checked);
     saveCurrentSelectionConfig(); // Save immediately when toggle changes
   };

  // --- Helper to get provider name --- //
  const getProviderName = (providerId: string): string => {
    const predefined = predefinedProviders.find(p => p.id === providerId);
    if (predefined) return predefined.name;
    const custom = customProviders.find(p => p.id === providerId);
    if (custom) return custom.name;
    return providerId; // Fallback
  };

  // --- Get current provider object --- //
  const getCurrentProvider = (): PredefinedProvider | undefined => {
      return predefinedProviders.find(p => p.id === selectedProviderId);
      // Add logic for custom providers if they have versions/details needed
  };

  // --- Get current provider versions --- //
   const getCurrentProviderVersions = (): string[] => {
     const provider = getCurrentProvider(); // Use the helper
     return provider?.versions || [];
   };

  // --- UI Rendering --- //
  return (
    <Form {...form}>
      <form className="space-y-6">
        <FormField
          control={form.control}
          name="enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">启用 AI 分析</FormLabel>
                <FormDescription>
                  控制是否在应用中使用 AI 进行分析和建议。
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    handleEnabledChange(checked);
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          name="provider"
          render={() => (
            <FormItem>
              <FormLabel>AI 提供商</FormLabel>
              <FormControl>
                <AIProviderSelector
                  predefinedProviders={predefinedProviders}
                  customProviders={customProviders}
                  selectedProvider={selectedProviderId}
                  onSelect={handleProviderChange}
                  onShowAddCustom={() => {console.warn("Add custom provider UI not implemented yet")}}
                  onDeleteCustom={(id) => {console.warn(`Delete custom provider ${id} not implemented yet`)}}
                />
              </FormControl>
              <FormDescription>
                选择用于分析的 AI 服务提供商。
              </FormDescription>
            </FormItem>
          )}
        />

        {getCurrentProviderVersions().length > 0 && (
          <FormField
            name="version"
            render={() => (
              <FormItem>
                <FormLabel>模型版本</FormLabel>
                <FormControl>
                  <AIModelVersionSelector
                    provider={getCurrentProvider()}
                    selectedVersion={selectedVersion}
                    onChange={handleVersionChange}
                  />
                </FormControl>
                <FormDescription>
                  为所选提供商选择具体的模型版本。
                </FormDescription>
              </FormItem>
            )}
          />
        )}

        <FormField
          name={`apiKey_${selectedProviderId}`}
          render={() => (
            <FormItem>
              <FormLabel>{getProviderName(selectedProviderId)} API 密钥</FormLabel>
              <FormControl>
                <div className="flex items-center gap-2">
                  <AIKeyInput
                    selectedProvider={selectedProviderId}
                    customProviders={customProviders}
                    value={currentApiKeyInput}
                    onChange={handleApiKeyInputChange}
                  />
                  <Button
                    type="button"
                    onClick={handleSaveApiKey}
                    disabled={apiKeyStatuses[selectedProviderId]?.status === 'saved' || !aiEnabled}
                    size="icon"
                    variant={apiKeyStatuses[selectedProviderId]?.status === 'unsaved' ? "default" : "outline"}
                   >
                     <Save className="h-4 w-4" />
                   </Button>
                </div>
              </FormControl>
                <FormDescription className="flex items-center gap-1 h-4"> 
                  {apiKeyStatuses[selectedProviderId]?.status === 'saved' && (
                    <><Check className="h-4 w-4 text-green-600" /> 已保存</>
                  )}
                  {apiKeyStatuses[selectedProviderId]?.status === 'unsaved' && (
                    <><RotateCw className="h-4 w-4 text-yellow-600 animate-spin-slow" /> 未保存更改</>
                  )}
                  {apiKeyStatuses[selectedProviderId]?.status === 'idle' && (
                    <>请输入密钥并保存</>
                  )}
                   {apiKeyStatuses[selectedProviderId]?.status === 'error' && (
                    <><XCircle className="h-4 w-4 text-red-600" /> {apiKeyStatuses[selectedProviderId]?.message || '保存失败'}</>
                  )}
                </FormDescription>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};

export default AIConnector;
