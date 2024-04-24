const fs = require('fs').promises;
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: ''
});

function createDescription(card) {
    let description = `Name: ${card.name}\n`;

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
    // Excerpt from the official Magic: the Gathering comprehensive rules at https://media.wizards.com/2024/downloads/MagicCompRules%2020240308.txt
    const keywords = await fs.readFile('./data/Keywords.txt').then(data => toString().split('\n').filter(x => x.trim() != ''));
    const data = [];
    let i = 0;

    for (const cardName in cards) {
        try {
            const card = cards[cardName][0];

            if (!card.name.includes('_') && (card.legalities.vintage === 'Legal' || card.legalities.vintage === 'Restricted')) {
                let question = [
                    `What does ${cardName} do?`,
                    `What does the card ${cardName} do?`,
                    `What abilities does ${cardName} have?`,
                    `Describe ${cardName}`,
                    `Please describe ${cardName}`,
                    `Describe the card ${cardName}`,
                    `Explain what ${cardName} does`,
                    `Please explain what ${cardName} does`,
                    `Explain what the card ${cardName} does`,
                    `Explain how ${cardName} works`,
                    `How does ${cardName} work?`,
                    `How does the card ${cardName} work?`,
                ][Math.floor(Math.random() * 12)];

                if (Math.random() > 0.5)
                    question = question.toLowerCase();

                const completion = await openai.chat.completions.create({
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful assistant.',
                        },
                        {
                            role: 'user',
                            content: `Below is the text of a Magic: the Gathering Card. Briefly describe what it does, focusing specifically on it's abilities. You don't need to restate the mana cost. Do not make assumptions about scenarios not directly stated on the card and paraphrase when possible.\n${createDescription(card)}`
                        }
                    ],
                    model: 'gpt-3.5-turbo-0125'
                });

                data.push({
                    instruction: question,
                    response: completion.choices[0].message.content + '\n\nRules text:\n' + createDescription(card),
                    category: 'description'
                });

                i++;

                if (i % 300 == 0) {
                    console.log((i / Object.keys(cards).length * 100).toFixed(2) + '%');

                    await fs.writeFile('./data/Descriptions.json', JSON.stringify(data, null, '\t'));
                }
            }
        } catch (error) {
            console.log(error);
        }
    }

    let example = null;
    let started = false;

    for (const line of keywords) {
        if (line.slice(0, 10).match(/\d{3}\.\d{2,3}\./) != null) {
            const keyword = line.split(' ').slice(1).join(' ').trim();
            let question = [
                `What does ${keyword} do?`,
                `What does the ability ${keyword} do?`,
                `What does the keyword ${keyword} do?`,
                `Describe ${keyword}`,
                `Describe the keyword ${keyword}`,
                `Explain what ${keyword} does`,
                `Explain what the ability ${keyword} does`,
                `Explain how ${keyword} works`,
                `How does ${keyword} work?`,
                `How does the keyword ${keyword} work?`,
            ][Math.floor(Math.random() * 10)];

            if (Math.random() > 0.5)
                question = question.toLowerCase();

            example =  {
                instruction: question,
                response: '',
                category: 'keyword'
            };
            started = true;
        } else if (started) {
            example.response = line.split(' ').slice(1).join(' ').trim();
            data.push(example);
            started = false;
        }
    }

    await fs.writeFile('./data/Descriptions.json', JSON.stringify(data, null, '\t'));
}

generate();