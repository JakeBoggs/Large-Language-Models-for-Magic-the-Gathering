const fs = require('fs').promises;
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: ''
});

async function generate() {
    // File obtained from the Commander Spellbook API at https://json.commanderspellbook.com/variants.json
    const combos = JSON.parse(await fs.readFile('./data/ComboDatabase.json').then(data => data.toString())).variants;
    const data = [];
    let i = 0;

    for (const combo of combos) {
        try {
            const completion = await openai.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant designed to output JSON.',
                    },
                    {
                        role: 'user',
                        content: `I will give you the steps of Magic: the Gathering combo and you will create a question asking about a combo that can be performed with one of the required cards, along with the corresponding answer. You don't need to specify that the combo is about Magic in the question. When answering, use conversational language and first explain what other cards are required, then describe all of the steps needed to perform the combo, as well as the results. Be concise, but don't leave out any steps. Respond in JSON in the following format: {"question": "[QUESTION]", "answer": "[ANSWER]"}\nCards required: ${combo.uses.map(x => x.card.name).join(', ')}\n${combo.otherPrerequisites.length > 0 ? 'Prerequisites: ' + combo.otherPrerequisites + '\n': ''}Combo steps:\n${combo.description}\nResults:\n${combo.produces.map(x => x.name).join(', ')}`
                    }
                ],
                model: 'gpt-3.5-turbo-0125',
                response_format: { type: 'json_object' }
            });

            data.push({
                instruction: JSON.parse(completion.choices[0].message.content).question,
                response: JSON.parse(completion.choices[0].message.content).answer,
                category: 'combo'
            });

            i++;
            
            if (i % 100 == 0) {
                console.log((i / combos.length * 100).toFixed(2) + '%');

                await fs.writeFile('./data/Interactions.json', JSON.stringify(data, null, '\t'));
            }
        } catch (error) {
            console.log(error);
        }
        // if (combo.popularity > 10) {
        //     const target = combo.produces.map(x => x.name)[Math.floor(Math.random() * combo.produces.length)].toLowerCase();

        //     data.push({
        //         instruction: `What's a combo that does ${target}?`,
        //         response: `You can use ${combo.uses.map(x => x.card.name).join(', ')} to achieve ${target}. Here's how:\n${combo.description}`,
        //         category: 'combo'
        //     });
        // }

        // const targetCard = combo.uses.map(x => x.card.name)[Math.floor(Math.random() * combo.uses.length)];

        // data.push({
        //     instruction: `Describe a combo that includes ${targetCard}`,
        //     response: `Sure! Here's a combo with ${targetCard}, ${combo.uses.map(x => x.card.name).filter(x => x != targetCard).join(', ')} that results in ${combo.produces.map(x => x.name).join(', ')}. Here's how to use it:\n${combo.description}`,
        //     category: 'combo'
        // });

        // data.push({
        //     instruction: `How does the combo with ${combo.uses.map(x => x.card.name).join(', ')} work?`,
        //     response: `To perform the combo, use the following steps:\n${combo.description}\nThis results in ${combo.produces.map(x => x.name).join(', ')}.`,
        //     category: 'combo'
        // });

        // for (const card of combo.uses) usedCards[card] = true;

        // if (i % 100 == 0) {
        //     console.log((i / combos.length * 100).toFixed(2) + '%');

        //     await fs.writeFile('./data/Interactions.json', JSON.stringify(data, null, '\t'));
        // }

        // Negative examples
        // What can X be used for
        // Explain the interaction between
        // I'm trying to do X with Y and Z, what steps should I take

        // data.push({
        //     instruction: `What happens when I ${combo.description}`,
        //     response: `This results in ${combo.produces.map(x => x.name).join(', ')}.`,
        //     category: 'interaction'
        // });
    }

    await fs.writeFile('./data/Interactions.json', JSON.stringify(data, null, '\t'));
}

generate();