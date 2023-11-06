import type {
    Awaitable,
    ButtonInteraction,
    Message,
    InteractionCollector,
    APIButtonComponentWithCustomId,
    InteractionCollectorOptions,
} from 'discord.js';
import { ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';

export type CommandKitButtonBuilderInteractionCollectorDispatch = (
    interaction: ButtonInteraction,
) => Awaitable<void>;

export type CommandKitButtonBuilderInteractionCollectorDispatchContextData = {
    /**
     * The message to listen for button interactions on.
     */
    message: Message;
    /**
     * If the collector should automatically reset the timer when a button is clicked.
     */
    autoReset?: boolean;
} & Omit<InteractionCollectorOptions<ButtonInteraction>, 'filter' | 'componentType'>;

export class ButtonKit extends ButtonBuilder {
    #onClickHandler: CommandKitButtonBuilderInteractionCollectorDispatch | null = null;
    #contextData: CommandKitButtonBuilderInteractionCollectorDispatchContextData | null = null;
    #collector: InteractionCollector<ButtonInteraction> | null = null;

    /**
     * Sets up an inline interaction collector for this button. This collector by default allows as many interactions as possible if it is actively used.
     * If unused, this expires after 24 hours or custom time if specified.
     * @param handler The handler to run when the button is clicked
     * @param data The context data to use for the interaction collector
     * @returns This button
     * @example
     * ```ts
     * const button = new ButtonKit()
     *   .setLabel('Click me')
     *   .setStyle(ButtonStyle.Primary)
     *   .setCustomId('click_me');
     *
     * const message = await channel.send({ content: 'Click the button', components: [new MessageActionRow().addComponents(button)] });
     *
     * button.onClick(async (interaction) => {
     *   await interaction.reply('You clicked me!');
     * }, { message });
     *
     * // remove onClick handler and destroy the interaction collector
     * button.onClick(null);
     * ```
     */
    public onClick(handler: null): this;
    public onClick(
        handler: CommandKitButtonBuilderInteractionCollectorDispatch,
        data: CommandKitButtonBuilderInteractionCollectorDispatchContextData,
    ): this;
    public onClick(
        handler: CommandKitButtonBuilderInteractionCollectorDispatch | null,
        data?: CommandKitButtonBuilderInteractionCollectorDispatchContextData,
    ): this {
        if (this.data.style === ButtonStyle.Link) {
            throw new TypeError('Cannot setup "onClick" handler for link buttons');
        }

        this.#destroyCollector();

        this.#onClickHandler = handler;
        if (handler && data) this.#contextData = data;

        this.#setupInteractionCollector();

        return this;
    }

    #setupInteractionCollector() {
        if (!this.#contextData || !this.#onClickHandler) return;

        const message = this.#contextData?.message;

        if (!message) {
            throw new TypeError(
                'Cannot setup "onClick" handler without a message in the context data',
            );
        }

        if ('customId' in this.data && !this.data.customId) {
            throw new TypeError('Cannot setup "onClick" handler without a custom id');
        }

        const data = {
            time: 86_400_000,
            autoReset: true,
            ...this.#contextData,
        };

        const collector = (this.#collector = message.createMessageComponentCollector({
            filter: (interaction) =>
                interaction.customId === (<APIButtonComponentWithCustomId>this.data).custom_id &&
                interaction.message.id === message.id,
            componentType: ComponentType.Button,
            ...data,
        }));

        this.#collector.on('collect', (interaction) => {
            const handler = this.#onClickHandler;

            if (!handler) return this.#destroyCollector();

            if (!this.#collector) {
                return collector.stop('destroyed');
            }

            if (data.autoReset) {
                this.#collector?.resetTimer();
            }

            return handler(interaction);
        });

        this.#collector.on('end', () => {
            this.#destroyCollector();
        });
    }

    #destroyCollector() {
        this.#collector?.stop('end');
        this.#collector?.removeAllListeners();
        this.#collector = null;
        this.#contextData = null;
        this.#onClickHandler = null;
    }
}