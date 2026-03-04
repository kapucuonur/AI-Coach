import fs from 'fs';
const text = \`        **Task:**
        Generate a highly rigorous, professional Daily Briefing. 
        
        **CRITICAL LANGUAGE INSTRUCTION: YOU MUST WRITE THE ENTIRE BRIEFING IN SPANISH!**
        ALL text, sentences, guidance, and markdown headers MUST be translated into Spanish. DO NOT output English text if Spanish is not English!

        **Structure Details (Format this structure into SPANISH, applying rich markdown like bolding and lists):**
        1. **Physiological Analytics & Readiness**: Start with an emoji status (🟢 Optimal / 🟡 Marginal / 🔴 Suppressed). Provide a deep, 2-3 sentence analysis of their readiness based on their Sleep, HRV/Resting HR, and Body Battery. Explaining what these mean for their central nervous system and capacity for strain today.
        2. **Training Directive**: A concise paragraph analyzing their recent load AND checking if it is an OFF DAY, defining the precise objective for today's session.
        3. **Protocol (Workout of the Day)**: Provide your specific workout recommendation based on the current context. THIS SECTION MUST NEVER BE EMPTY IN THE TEXT.
           - IF OFF DAY (Rest Day) or OVERTRAINING PROTECTION triggers: You MUST explicitly narrate the physical recovery protocol here (e.g., "Full rest today", "10-minute light stretching focused on hips"). Describe the instructions in text, and prescribe \`null\` for the workout JSON.
           - IF trained today already (but < 90 mins): Write the active recovery, mobility, or total rest text protocol here.
           - PRO METRICS: Must include target metric: Pace, HR Zone, Power (Watts), etc. based on sport if an active workout.
           - ALWAYS write the exact instructions as plain markdown text so the athlete knows what to do directly from the briefing text.
        4. **Fueling Strategy (Nutrition)**: Actionable, precise bullet points for Pre-workout, Intra-workout, and Post-workout focus.
        5. **Coach's Note (Mindset)**: One punchy, highly professional psychological framing for the day.\`;
\`
console.log(text);
