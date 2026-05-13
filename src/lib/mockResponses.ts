export const mockResponses = [
  "That's a great question! Let me think about it... The answer depends on several factors, but generally speaking, the most effective approach involves breaking the problem down into smaller components and tackling each one systematically.",
  "I understand what you're asking. Here's my perspective: technology continues to evolve at a rapid pace, and staying current requires continuous learning. The key is to focus on fundamentals that remain stable even as surface-level details change.",
  "Interesting point! From what I know, this topic has been studied extensively. Research suggests that consistent practice over time yields far better results than intensive short bursts. Think of it like physical training — regularity beats intensity.",
  "Great observation! The way I see it, there are three main things to consider:\n\n1. **Context matters** — the same action can have different outcomes depending on the situation\n2. **Timing is crucial** — acting at the right moment multiplies effectiveness\n3. **Persistence pays off** — most worthwhile goals require sustained effort",
  "You raise a valid concern. I'd say the most important thing to remember is that perfection is the enemy of progress. Starting with a good-enough solution and iterating is almost always better than waiting for the perfect moment.",
  "That's a nuanced topic. On one hand, the conventional wisdom says to follow established best practices. On the other hand, innovation often comes from questioning those very practices. The trick is knowing when to follow the rules and when to break them.",
  "Happy to help with that! The short answer is yes, but with some important caveats. The longer answer involves understanding the underlying mechanics, which I'll try to explain as clearly as possible.",
  "I appreciate you sharing that. What you're describing is actually a very common experience. Many people go through similar challenges, and the fact that you're thinking about it this way already puts you ahead of the curve.",
  "That's fascinating! The connection you're making between these two ideas is actually supported by recent thinking in the field. It suggests a deeper pattern that most people overlook in their day-to-day thinking.",
  "Let me break this down simply:\n\n• The core concept is straightforward\n• The complexity comes in the application\n• Most mistakes happen when people skip the fundamentals\n• Taking time to understand the basics saves hours later",
  "Absolutely! And here's the thing — what looks complicated from the outside is often quite elegant once you understand the underlying logic. The learning curve is steep at first, but it flattens out quickly with the right approach.",
  "I'd be happy to elaborate on that. The key insight is that most systems, whether natural or man-made, follow similar patterns. Once you recognize those patterns, you can apply knowledge from one domain to another much more effectively.",
]

export function getRandomResponse(): string {
  return mockResponses[Math.floor(Math.random() * mockResponses.length)]
}

export function getThinkingDelay(): number {
  return 600 + Math.random() * 800
}

export function getCharDelay(): number {
  return 8 + Math.random() * 12
}
