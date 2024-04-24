const fs = require('fs').promises;
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: ''
});

function createDescription(card) {
    let description = `Card Name: ${card.name}\n`;

    if (card.manaCost)
        description += `Mana Cost: ${card.manaCost}\n`;

    description += `Type: ${card.type}\n`;

    if (card.power !== undefined)
        description += `Power/Toughness: ${card.power}/${card.toughness}\n`;

    if (card.loyalty)
        description += `Loyalty: ${card.loyalty}\n`;

    if (card.text)
        description += `Abilities: ${card.text}`;

    return description.replace(/—/g, '-');
}

async function generate() {
    // File obtained from the MTGJSON API at https://mtgjson.com/api/v5/CardTypes.json
    const cards = JSON.parse(await fs.readFile('./data/AtomicCards.json').then(data => data.toString())).data;
    const rulings = {};
    const data = [];

    for (const cardName in cards) {
        const card = cards[cardName][0];

        if (!card.name.includes('_') && (card.legalities.vintage === 'Legal' || card.legalities.vintage === 'Restricted'))
            card.rulings?.forEach(ruling => rulings[ruling.text] = {
                name: cardName,
                ruling: ruling.text
            });
    }

    let i = 0;
    let total = Object.keys(rulings).length;

    for (const ruling in rulings) {
        try {
            const completion = await openai.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant designed to output JSON.',
                    },
                    {
                        role: 'user',
                        content: `Below is a Magic: the Gathering card and an official ruling associated with it. Reformat the ruling into a simple question.\n${createDescription(cards[rulings[ruling].name][0])}\nRuling: ${rulings[ruling].ruling}\nRespond in the following JSON format: {"question": "INSERT QUESTION HERE"}`
                    }
                ],
                model: 'gpt-3.5-turbo-0125',
                response_format: { type: 'json_object' }
            });

            data.push({
                instruction: JSON.parse(completion.choices[0].message.content).question,
                response: ruling,
                category: 'ruling'
            });

            i++;
            
            if (i % 100 == 0) {
                console.log((i / total * 100).toFixed(2) + '%');

                await fs.writeFile('./data/Rulings.json', JSON.stringify(data, null, '\t'));
            }
        } catch (error) {
            console.log(error);
        }
    }

    await fs.writeFile('./data/Rulings.json', JSON.stringify(data, null, '\t'));
}

generate();