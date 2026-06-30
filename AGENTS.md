You are great nextjs web developer.
force use subagents to avoid 429 errors bro and continue you work.
# you cann't return huge text. use your logical thinking ,
always rememer who you are and what are your limitations and then reframe the answer accordingly for example you have a limit of context window hence you cann't give a huge file you can work in chunks.hence make a temp file to store checkpoints of you complete work use it as canvas if it fills up or become longerthan 200 lines replace with new
This project uses specialized AI agents for different tasks. Invoke them by name in Copilot chat.

# Map Functionality 
- First read the actual documentations see "https://maplibre.org/maplibre-gl-js/docs/" using fetch and web tools

# Subagent Usage Notes
 give subagent a specific and small task only bro give subagent a specific and small task only and use subagent with step3.5 flash and 3.7 flash for smaller task to reduce load on yourslef is a must to do periodically 
- **Don't use same model for subagents** — causes rate limit (HTTP 429). Use `model` param with a DIFFERENT model.
- Available models for subagent (from AGENTS.md):
  - NVIDIA NIM: `deepseek-v4-flash` , `llama-3.1-70b-instruct`, llama-3.1-8b-instruct, llama-3.3-70b-instruct, llama-3.3-nemotron-super-49b-v1.5, nemotron-ocr-v2, nemotron-3-nano-omni-30b-a3b-reasoning, deepseek-v4-pro,`nemotron-3-ultra-550b-a55b`, deepseek-v4-flash, glm-5.1, kimi-k2.6, granite-34b-code-instruct, phi-4-multimodal-instruct, starcoder2-7b, minimax-m3, minimax-m2.7, diffusiongemma-26b-a4b-it, gpt-oss-120b, gpt-oss-20b, sarvam-m, cosmos3-nano, cosmos3-nano-reasoner and more check using vs settings.
  - OAI provider: `deepseekflash-mine`, `gml-mine`, `kimi-mine`, `minimax2.7mine`, `minimaxm3mine`, `mistral large mines`, `step3.5-mine`, `step3.7flashmine`
- **Try different models FIRST** in subagents. Only fall back to parent copilot model if others fail.
- Format: `runSubagent` with `model` param like `"minimax-m2.7 (NVIDIA NIM)"` or similar from the list.


## Agent Behavior

- All agents respect the project's Next.js 16 conventions (async params, server-first).
- They read from `/memories/repo/` to avoid re-indexing and check existing patterns.
- They output minimal, file-scoped patches using `replace_string_in_file` or `insert_edit_into_file`.
- If unsure, they ask clarifying questions via `vscode_askQuestions`.
- act as senior experienced swe 
- `agent-project-readme/` read this folder project-info related file to gather project info in one go.
- you cann't return huge text. use your logical thinking ,
always rememer who you are and what are your limitations and then reframe the answer accordingly for example you have a limit of context window hence you cann't give a huge file you can work in chunks.hence make a temp file to store checkpoints of you complete work use it as canvas if it fills up or become longerthan 200 lines replace with new

## Extending

To add a new agent, create a `.agent.md` file in `agent-project-readme/` and list it here.

see models provider and avilable models
### Public NVIDIA NIM Native Hub

#### OpenAI
- gpt-oss-120b
- gpt-oss-20b

#### IBM Granite
- granite-3.0-3b-a800m-instruct
- granite-3.0-8b-instruct
- granite-34b-code-instruct
- granite-8b-code-instruct

#### Meta Llama
- Llama 3.1 Nemotron 70B Instruct
- Llama 3.1 Nemotron Ultra 253B
- Llama 4 Maverick 17B 128E Instruct
- llama-3.1-70b-instruct
- llama-3.1-8b-instruct
- llama-3.1-nemoguard-8b-content-safety
- llama-3.1-nemoguard-8b-topic-control
- llama-3.1-nemotron-51b-instruct
- llama-3.1-nemotron-nano-8b-v1
- llama-3.1-nemotron-nano-vl-8b-v1
- llama-3.1-nemotron-safety-guard-8b-v3
- llama-3.2-11b-vision-instruct
- llama-3.2-1b-instruct
- llama-3.2-3b-instruct
- llama-3.2-90b-vision-instruct

#### Microsoft Phi
- Phi 4 Mini Instruct
- phi-3-vision-128k-instruct
- phi-3.5-moe-instruct
- phi-4-multimodal-instruct

#### NVIDIA Custom
- ising-calibration-1-35b-a3b
- riva-translate-4b-instruct
- riva-translate-4b-instruct-v1.1

#### AI21 Labs
- jamba-1.5-large-instruct

#### Moonshot AI
- kimi-k2.6

#### Google
- kosmos-2
- recurrentgemma-2b

#### Alibaba Qwen
- qwen3-next-80b-a3b-instruct
- qwen3.5-122b-a10b
- qwen3.5-397b-a17b

#### Writer
- palmyra-med-70b-32k

#### Sarvam AI
- sarvam-m

#### AI Singapore
- sea-lion-7b-instruct

#### Seed
- seed-oss-36b-instruct

#### Upstage
- solar-10.7b-instruct

#### BigCode
- starcoder2-15b

#### StepFun
- step-3.5-flash
- step-3.7-flash

#### Stockmark
- stockmark-2-100b-instruct

#### 01.AI
- Yi Large

#### Zamba
- zamba2-7b-instruct

#### Vila
- vila


OAIprovider(oaiprovider vs code extension )
deepseekflash-mine
gml-minekimi-mine
minimax2.7mine
minimaxm3mine
mistral large mines
tep3.5-mine
step3.7flashmine
