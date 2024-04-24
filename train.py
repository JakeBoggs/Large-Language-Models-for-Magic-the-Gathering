import gc
import torch
from datasets import load_dataset
from peft import LoraConfig, PeftModel, get_peft_model
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments
)
from trl import SFTTrainer
from transformers import TrainingArguments

base_model = "NousResearch/Meta-Llama-3-8B-Instruct"
new_model = "MTG-Llama"

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=True,
)

peft_config = LoraConfig(
    r=64,
    lora_alpha=32,
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
    target_modules=['up_proj', 'down_proj', 'gate_proj', 'k_proj', 'q_proj', 'v_proj', 'o_proj']
)

tokenizer = AutoTokenizer.from_pretrained(base_model)

model = AutoModelForCausalLM.from_pretrained(
    base_model,
    quantization_config=bnb_config,
    device_map="auto",
    attn_implementation="eager"
)
model = get_peft_model(model, peft_config)

dataset = load_dataset("jakeboggs/MTG-Eval")
dataset = dataset.shuffle(seed=42)

def format_chat_template(example):
    convos = [{
        'role': 'user',
        'content': example['instruction']
    },
    {
        'role': 'assistant',
        'content': example['response']
    }]
    texts = tokenizer.apply_chat_template(convos, tokenize=False, add_generation_prompt=False)

    return { 'text' : texts }

dataset = dataset.map(format_chat_template)

tokenizer.pad_token = tokenizer.eos_token

trainer = SFTTrainer(
    model = model,
    tokenizer = tokenizer,
    train_dataset = dataset['train'],
    eval_dataset = dataset['test'],
    dataset_text_field = 'text',
    max_seq_length = 2048,
    dataset_num_proc = 2,
    packing = False,
    peft_config=peft_config,
    args = TrainingArguments(
        per_device_train_batch_size = 2,
        gradient_accumulation_steps = 4,
        warmup_steps = 5,
        max_steps = 75,
        learning_rate = 2e-4,
        fp16 = not torch.cuda.is_bf16_supported(),
        bf16 = torch.cuda.is_bf16_supported(),
        logging_steps = 1,
        optim = 'adamw_8bit',
        weight_decay = 0.01,
        lr_scheduler_type = 'linear',
        output_dir='outputs'
    )
)
trainer.train()
trainer.save_model(new_model)

del trainer, model
gc.collect()
torch.cuda.empty_cache()

tokenizer = AutoTokenizer.from_pretrained(base_model)
model = AutoModelForCausalLM.from_pretrained(
    base_model,
    low_cpu_mem_usage=True,
    return_dict=True,
    torch_dtype=torch.float16,
    device_map="auto"
)

model = PeftModel.from_pretrained(model, new_model)
model = model.merge_and_unload()

model.push_to_hub(new_model, use_temp_dir=False)
tokenizer.push_to_hub(new_model, use_temp_dir=False)