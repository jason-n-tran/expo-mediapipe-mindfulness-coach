/**
 * PromptBuilder Service
 * Constructs system prompts with philosophical guidance
 */

import { ChatMessage, MindfulnessTopic, QuickAction } from '../../types';
import { BASE_SYSTEM_PROMPT, TOPIC_PROMPTS, QUICK_ACTION_PROMPTS } from '../../constants/prompts';
import { PromptOptions, PromptBuilderInterface, UserContext } from './types';

export class PromptBuilder implements PromptBuilderInterface {
  /**
   * Build base system prompt with optional customization
   */
  buildSystemPrompt(options?: PromptOptions): string {
    let prompt = BASE_SYSTEM_PROMPT;

    if (!options) {
      return prompt;
    }

    // Add emphasis on specific philosophical tradition
    if (options.emphasizeBuddhism && !options.emphasizeStoicism) {
      prompt += '\n\nFor this conversation, place extra emphasis on Buddhist teachings and practices.';
    } else if (options.emphasizeStoicism && !options.emphasizeBuddhism) {
      prompt += '\n\nFor this conversation, place extra emphasis on Stoic philosophy and principles.';
    }

    // Add user context if provided
    if (options.userContext) {
      const contextAddition = this.buildUserContextPrompt(options.userContext);
      if (contextAddition) {
        prompt += '\n\n' + contextAddition;
      }
    }

    // Add conversation goal if specified
    if (options.conversationGoal) {
      prompt += `\n\nConversation Goal: ${options.conversationGoal}`;
    }

    return prompt;
  }

  /**
   * Build user context prompt addition
   */
  private buildUserContextPrompt(context: UserContext): string {
    const contextParts: string[] = [];

    if (context.timeOfDay) {
      const timeGreetings = {
        morning: 'The user is starting their day. Consider morning-appropriate practices and intentions.',
        afternoon: 'The user is in the middle of their day. Consider midday check-ins and energy management.',
        evening: 'The user is winding down their day. Consider reflection and evening practices.',
        night: 'The user is ending their day. Consider rest, letting go, and preparation for sleep.',
      };
      contextParts.push(timeGreetings[context.timeOfDay]);
    }

    if (context.emotionalState) {
      contextParts.push(`The user's current emotional state: ${context.emotionalState}. Acknowledge this with compassion.`);
    }

    if (context.recentTopics && context.recentTopics.length > 0) {
      contextParts.push(`Recent conversation topics: ${context.recentTopics.join(', ')}. Build on previous discussions when relevant.`);
    }

    return contextParts.join(' ');
  }

  /**
   * Add topic-specific emphasis to system prompt
   */
  addTopicEmphasis(topic: MindfulnessTopic): string {
    return TOPIC_PROMPTS[topic] || '';
  }

  /**
   * Format conversation history for context window
   */
  formatConversationHistory(messages: ChatMessage[]): string {
    if (!messages || messages.length === 0) {
      return '';
    }

    const formattedMessages = messages
      .filter(msg => msg.role !== 'system') // Exclude system messages
      .map(msg => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        return `${role}: ${msg.content}`;
      })
      .join('\n\n');

    return formattedMessages;
  }

  /**
   * Get quick action prompt
   */
  getQuickActionPrompt(action: QuickAction): string {
    return QUICK_ACTION_PROMPTS[action] || '';
  }
}

// Export singleton instance
export const promptBuilder = new PromptBuilder();
