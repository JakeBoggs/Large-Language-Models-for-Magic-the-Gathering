from datasets import load_dataset

dataset = load_dataset('json', data_files='data/Dataset.json')
dataset = dataset['train'].train_test_split(test_size=0.05)

dataset.push_to_hub('jakeboggs/MTG-Eval')