import { SlashCommandProps, CommandOptions, CommandData } from '../../../src/index';

export const data: CommandData = {
    name: 'ping',
    description: 'Replies with pong!',
};

export async function run({ interaction, client, handler }: SlashCommandProps) {
    interaction.reply(`:ping_pong: Pong! \`${client.ws.ping}ms\``);
}

export const options: CommandOptions = {
    devOnly: true,
};