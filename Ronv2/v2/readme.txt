The files are versioned.
Every single time you start working, you RESET the LLM first — clean context, zero history.
You load the exact version you're currently working on.
You ask ONLY ONE question or give ONE task at a time. Maximum two.
Once you hit five questions/tasks in one context, it starts bullshitting and looping.
That's why you RESET the LLM regularly. Otherwise it gets lost in a circle trying to please you.
LLMs have way more trained, emergent psychometry for producing "human-expected responses" than actual reasoning.
In other words: it answers to make you happy, not to actually solve the fucking problem.
Always tell the LLM exactly what level you're at. If you don't know something, write it straight from the beginning: "I don't know this topic at all. Tell me how a real professional in this field would do it."
Then the LLM switches into something like mentor/expert mode and actually helps you.
Without that, it won't trigger the proper behavior in its context — it'll just nod along like a polite Indian support guy saying "yes sir, very good sir".
When working on math, especially when you want to implement something, always work in UTF-8.
It makes life much easier for programmers — they can just paste it straight into code and convert it to loops themselves.
To convert LaTeX text to proper UTF-8 without changing the actual text, use the prompt in the file:
prompt_transform_UTF8.txt
Make yourself a dedicated project with that prompt. You open it, paste the text, and it instantly converts everything correctly. It's basically a UTF-8 translator.
If you want the model's reasoning to work much better, without shoving vaseline and wordy bullshit up your ass, create a project with the main system instruction from the file:
prompt_clean_antysycophant.txt
Warning: you might not like how it answers. Ask it how to make a cheese sandwich and you'll understand.
This prompt saves 15–30% token usage. No fluff, no filler, no corporate word vomit. LLMs burn a ton of tokens on transformers just to fill the response window with nice-sounding nothing.
This is roughly how the LLM would answer if it hadn't been fucked up during training to always produce the "average human-expected pleasant response".
And the most important rule: 1–2 questions max, then reset.
If you want longer sessions with the LLM, do it only in topics where you already know the subject well and can tell when it's feeding you bullshit.
I’m starting to think you could build a real business just teaching people how to actually use these machines properly.
The amount of slop right now is fucking terrible.
It’s not that LLMs are bad or that they hallucinate by nature.
You just have to use them effectively.
They are not oracles. They are expert support systems with a highly developed ass-kissing feature.