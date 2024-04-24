import json
import torch
import requests
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig
)

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=True,
)

model_id = "NousResearch/Meta-Llama-3-8B-Instruct"
model = AutoModelForCausalLM.from_pretrained(model_id, quantization_config=bnb_config, device_map="auto")
tokenizer = AutoTokenizer.from_pretrained(model_id, add_eos_token=True)

dataset = load_dataset("jakeboggs/MTG-Eval")

i = 0
total = 0

for example in dataset['test']:
    try:
        if example['category'] == 'description':
            continue

        prompt = tokenizer.apply_chat_template([{
            'role': 'user',
            'content': example['instruction']
        }], tokenize=False, add_generation_prompt=True)

        model_inputs = tokenizer(prompt, return_tensors="pt", add_special_tokens=True).to('cuda')

        generated_ids = model.generate(**model_inputs, max_new_tokens=1000, do_sample=True, pad_token_id=tokenizer.eos_token_id, eos_token_id=[tokenizer.eos_token_id, tokenizer.convert_tokens_to_ids("<|eot_id|>")])

        decoded = tokenizer.decode(generated_ids[0], skip_special_tokens=True)

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer API-KEY"
        }

        payload = {
            "model": "gpt-4-turbo",
            "response_format": { "type": 'json_object' },
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "You are an expert grader who will be given a Magic: the Gathering related question and correct answer, along with a students response. You rate the student's response on a scale of 1-5, with 5 being entirely correct and 1 being entirely incorrect. Accurately identify any issues with the answer and explain why the students response is entirely correct, partially correct, or entirely incorrect. Reply in the following JSON format: {\"explanation\": \"[EXPLANATION]\", \"score\": SCORE}\n\"Question: "+ example['instruction'] + "\nCorrect answer: "+ example['response'] + "\nStudent's answer: " + decoded.split("assistant")[1]
                        }
                    ]
                }
            ]
        }

        response = json.loads(requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload).json()['choices'][0]['message']['content'])

        total += float(response['score'])

        i += 1

        print(response, total / i)

        if i > 200:
            break
    except Exception as e:
        print(e)

print(total / i)