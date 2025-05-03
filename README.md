# Large Language Models for Magic: the Gathering

This repository contains the code and resources for fine-tuning a Large Language Model (LLM) on a custom Magic: The Gathering (MTG) dataset and evaluating its performance.

## Overview

Magic: The Gathering's complexity, stemming from over 27,000 unique cards and a nearly 300-page rulebook, poses significant challenges for AI systems, often leading to inaccurate interpretations and hallucinations. This project aims to address these challenges by:

1.  **Creating a Custom Dataset:** A comprehensive dataset of MTG-related question-answer pairs covering card descriptions, rules clarifications, and card interactions.
2.  **Developing an Evaluation Metric (MTG-Eval):** A method to assess an LLM's understanding of MTG rules and interactions.
3.  **Fine-tuning an LLM:** Training Meta's Llama 3 8B Instruct model on the custom dataset.
4.  **Evaluating Performance:** Measuring the fine-tuned model's improvement over the base model using GPT-4 for scoring.

## Dataset

The custom dataset comprises over 80,000 question-answer pairs generated using data from [MTGJSON](https://mtgjson.com/) and [Commander Spellbook](https://commanderspellbook.com/), reformatted using GPT-3.5. It is divided into three categories:

1.  **Card Descriptions:** Questions about specific card functionalities (e.g., "What does \[Card Name] do?").
2.  **Rules Questions:** Questions derived from official MTG rulings to clarify niche interactions.
3.  **Card Interactions:** Questions about combos and synergies (e.g., "What is a combo with \[Card Name]?").

The dataset is available on Hugging Face: [jakeboggs/MTG-Eval](https://huggingface.co/datasets/jakeboggs/MTG-Eval)

## Model

*   **Base Model:** [NousResearch/Meta-Llama-3-8B-Instruct](https://huggingface.co/NousResearch/Meta-Llama-3-8B-Instruct)
*   **Fine-tuning:** Performed using QLoRA (Quantized Low-Rank Adaptation) via the `peft` library for efficient training.
    *   **Quantization:** 4-bit NF4 quantization using `bitsandbytes` with float16 compute data type.
    *   **LoRA Config:** `r=64`, `lora_alpha=32`, `lora_dropout=0.05`, targeting attention projection layers (`q_proj`, `k_proj`, `v_proj`, `o_proj`) and feed-forward layers (`gate_proj`, `up_proj`, `down_proj`).
*   **Fine-tuned Model:** Available on Hugging Face: [jakeboggs/MTG-Llama](https://huggingface.co/jakeboggs/MTG-Llama)

## Evaluation

The fine-tuned model was evaluated against the base model on a test subset of the data (rules and interactions categories). GPT-4 was used to score the models' responses on a 1-5 scale.

*   **Result:** The fine-tuned model showed a 10.5% improvement, increasing the average score from 1.62 to 1.79. While an improvement, there is significant room for further development.

## Setup

1.  **Prerequisites:**
    *   Node.js
    *   Python 3
    *   An OpenAI API Key

2.  **Install Dependencies:**
    *   Python: `pip install -U transformers datasets accelerate peft trl bitsandbytes huggingface_hub torch requests`
    *   Node.js: `npm install`

3.  **Download Data:**
    *   Create a `data/` directory in the project root.
    *   Download `AtomicCards.json` from [MTGJSON](https://mtgjson.com/api/v5/AtomicCards.json.zip) and place it in `data/`.
    *   Download `variants.json` from [Commander Spellbook](https://json.commanderspellbook.com/variants.json) and rename it to `ComboDatabase.json`, placing it in `data/`.
    *   (Optional) Download the [MTG Comprehensive Rules](https://media.wizards.com/2024/downloads/MagicCompRules%2020240308.txt) and create a `Keywords.txt` file in `data/` containing relevant keyword definitions if you intend to modify the `generateDescriptions.js` script's keyword section.

4.  **Add OpenAI API Key:**
    *   Insert your OpenAI API key into the designated spots in the following files:
        *   `evaluate.py`
        *   `generateDescriptions.js`
        *   `generateInteractions.js`
        *   `generateRulings.js`

## Usage

1.  **Generate Data (Optional - Pre-generated dataset available on Hugging Face):**
    *   Run the generation scripts:
        *   `node generateDescriptions.js`
        *   `node generateInteractions.js`
        *   `node generateRulings.js`
    *   These scripts will create `Descriptions.json`, `Interactions.json`, and `Rulings.json` in the `data/` directory. You will need to combine and format these into the final dataset structure if generating from scratch.

2.  **Train Model (Optional - Pre-trained model available on Hugging Face):**
    *   Run the training script: `python train.py`
    *   This script uses the `trl` library's `SFTTrainer` to fine-tune the base Llama 3 8B Instruct model on the `jakeboggs/MTG-Eval` dataset.
    *   Key Training Parameters:
        *   `max_steps`: 75
        *   `learning_rate`: 2e-4
        *   `per_device_train_batch_size`: 2
        *   `gradient_accumulation_steps`: 4
        *   `optimizer`: `adamw_8bit`
        *   `lr_scheduler_type`: `linear`
        *   Mixed precision (`fp16`/`bf16`) is enabled based on GPU support.
    *   The script saves the trained LoRA adapters, merges them with the base model, and uploads the final model to Hugging Face Hub.

3.  **Evaluate Model:**
    *   Run the evaluation script: `python evaluate.py`
    *   This script uses the fine-tuned model (`MTG-Llama` by default, requires Hugging Face Hub login or local download) and the `jakeboggs/MTG-Eval` dataset to calculate performance, using GPT-4 for scoring. Ensure your OpenAI API key is correctly configured.

## Acknowledgments

*   Thanks to the team at [Commander Spellbook](https://commanderspellbook.com/) for their dataset.
*   All generated data is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.