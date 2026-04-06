# Null Uncertainty: A Step-by-Step Guide for Programmers

## What this guide covers

You're going to learn about three levels of "not knowing things" that happen when systems talk to each other. The third level — null uncertainty — is the one nobody teaches, and it's the one that causes the worst bugs. Not crashes. Not errors. Bugs where everything looks fine and the answer is wrong.

---

## Step 1: Start with something you already know

You write an API. It receives JSON. You parse it. You use the values. This is what you do every day.

```python
import json

data = json.loads('{"date": "2026-04-05", "amount": 1000000, "currency": "SGD"}')

# You now have data["date"], data["amount"], data["currency"]
# They parsed. No errors. Types check out. Life is good.
```

Here's the question this guide is about: **how do you know the values mean what you think they mean?**

Not "are they valid JSON." Not "are they the right type." Those are solved problems. The question is: does `"2026-04-05"` mean April 5th, or did somebody convert it from `"4/5/2026"` and it was actually May 4th?

You can't answer that by looking at the JSON. The answer isn't in the data. It's in the head of whoever produced the data. That's the whole problem.

---

## Step 2: Three levels of not knowing

### Level 1: Known unknown — you have a variable, you don't have the value

This is the kind of uncertainty you already deal with.

```python
temperature = None  # I know I need a temperature. I don't have it yet.

# I can check for it:
if temperature is None:
    print("Missing temperature — go fetch it")

# I can estimate it:
temperature = get_sensor_reading()  # might be noisy, but I know what I'm looking for

# I can put a range on it:
temperature_range = (18.0, 25.0)  # "I think it's somewhere in here"
```

**What you have:** A variable. A name. A slot in your data model. You know what you're missing. You might not know the exact value, but you know the *question*.

**How you fix it:** Read a sensor. Call an API. Take a measurement. Run more samples. The fix lives inside your system — you just need more data of a kind you already understand.

**In uncertainty terms:** This is *risk*. You know the question ("what's the temperature?") and you can estimate the odds ("probably between 18 and 25").

---

### Level 2: Unknown unknown — the variable itself is missing, but you *could* add it

```python
# Your data model for a trade:
trade = {
    "date": "2026-04-05",
    "amount": 1000000,
    "currency": "SGD",
    "direction": "buy"
}

# You never thought to include "timezone".
# There is no trade["timezone"]. It's not None. The key doesn't exist.
# But if someone said "hey, you should track timezone," you'd go:

trade["timezone"] = "UTC+8"  # Oh yeah, good point. Added.
```

**What you have:** No variable. No slot. But your system *can* represent it — you just haven't thought to. The moment someone tells you it matters, you add a field and move on.

**How you fix it:** Someone points it out. You read a post-mortem. You notice a bug and trace it back to a missing field. The fix requires someone to *say* "you're missing this" — but once they do, your system can absorb it.

**In uncertainty terms:** This is *Knightian uncertainty* or the colloquial "unknown unknown." You don't know what you don't know — but your framework can represent it once you find out. The limitation is awareness, not architecture.

**The key thing:** You *could* discover this yourself. You might look at your schema one day and think, "wait, should I be tracking timezone?" The question can arise from inside your system. Maybe a test fails. Maybe an edge case hits. Something internal can trigger the realization.

---

### Level 3: Null uncertainty — the variable doesn't exist in your system, and nothing inside your system can tell you it should

This is the hard one. Read this carefully.

```python
# SYSTEM A (the trade agent) receives a CSV from a human:
raw = "4/5/2026,1000000,Singapore,SGX,buy,market,TRD-4471"

# System A looks at "4/5/2026" and thinks: "April 5th"
# (It could have been May 4th. System A assumed MM/DD.)
# System A converts it and writes JSON output:

output = {
    "date": "2026-04-05",       # ← assumption hardened into data
    "amount": 1000000,
    "currency": "SGD",
    "instrument": "S68.SI",
    "direction": "buy"
}
```

Now System B — a completely separate agent — receives this JSON:

```python
# SYSTEM B (the risk agent) receives System A's JSON.
# It parses it. Everything is clean.

trade = json.loads(system_a_output)

# System B's state space — everything it knows about:
# - trade["date"] → "2026-04-05" (a fact, as far as B knows)
# - trade["amount"] → 1000000
# - trade["currency"] → "SGD"
# - its own risk models
# - its own volatility assumptions
# - its own correlation matrices

# What System B does NOT have:
# - any variable representing "was the date ambiguous?"
# - any variable representing "which format did the original CSV use?"
# - any variable representing "did System A make an assumption here?"
# - any knowledge that there WAS an original CSV
# - any knowledge that System A even exists as a separate system
```

Here is the critical part. Read it twice:

```python
# Can System B discover the problem?

# Try 1: Validate the date
from datetime import datetime
parsed = datetime.strptime(trade["date"], "%Y-%m-%d")  # ✓ Valid date

# Try 2: Check if it's a business day
print(parsed.weekday())  # Returns 6 = Sunday. Hmm.
# But System B doesn't know if the SENDER meant April 5 or May 4.
# If the sender meant May 4, it's a Monday. Perfectly normal.
# System B doesn't know there's an alternative to check.

# Try 3: Run an anomaly detector on the date
# Anomaly detector says: "2026-04-05 is a valid date in the expected range."
# Correct! It IS a valid date. It just might be the WRONG valid date.

# Try 4: Check confidence
# Confidence = 100%. It parsed. It validated. It's in range.

# Try 5: Any other function you can think of...
# ALL functions that System B can run take trade["date"] as input.
# trade["date"] is "2026-04-05" regardless of whether the original was
# MM/DD or DD/MM. Every function returns the same output either way.
# There is no test System B can write that distinguishes the two cases.
```

**What you have:** Nothing. No variable. No slot. No way to create the slot. No signal that the slot should exist. Your system is *structurally incapable* of representing the question "was this date ambiguous at the previous system?" — because "the previous system's interpretation" is not a concept in your data model.

**Why it's worse than Level 2:** At Level 2, you *could* discover the problem yourself. A test might fail. An edge case might surface it. Something internal could trigger the thought "maybe I'm missing a field." At Level 3, **no internal event can trigger the realization**, because every internal check passes. The JSON is valid. The date parses. The types check. The anomaly detector is silent. Every function your system can compute returns "looks good."

**The formal statement:** Let S be everything your system can represent (its state space). Let F(S) be every function your system can compute over S. The missing variable ω (the original CSV's date format) is not in S. Therefore no function in F(S) takes ω as input. Therefore no function in F(S) can output different values for different values of ω. Therefore no function in F(S) can detect the problem. Period. This is not a limitation of your code. It's a *mathematical fact about functions and their inputs.*

**How you fix it:** You cannot fix it from inside your system. You have to **reach across the boundary** — back to System A, or back to the original sender — and ask. That asking has a cost: time, compute, an API call, a Slack message, an email. That cost is never zero. That's the "unit cost" in the companion paper's title. And the act of asking — rotating your attention from your own data to the other system's data and comparing — is what the framework calls a *rotation*.

---

## Step 3: Why this isn't just "bad data quality"

The data is perfect. Say it again: **the data is perfect.**

```python
# The JSON is valid.
json.loads(system_a_output)  # ✓ no parse error

# Every field has the right type.
isinstance(trade["date"], str)        # ✓
isinstance(trade["amount"], int)      # ✓
isinstance(trade["currency"], str)    # ✓

# The date is a real date.
datetime.strptime(trade["date"], "%Y-%m-%d")  # ✓

# The currency is a real currency.
trade["currency"] in ["USD", "SGD", "GBP", "EUR"]  # ✓

# The amount is in a reasonable range.
0 < trade["amount"] < 1e9  # ✓
```

Every data quality check passes. Every schema validation passes. Every type check passes. The problem is not that the data is bad. The problem is that **valid data and correct data are not the same thing**, and no function of the data alone can tell you which one you have.

---

## Step 4: Why this isn't a POMDP (the thing ML people will say it is)

If you've taken a machine learning course, someone might say: "This is just partial observability. Use a POMDP."

Here's why it's not:

```python
# A POMDP agent knows what it doesn't know:

class POMDPAgent:
    def __init__(self):
        self.belief = {
            "date_format": {"MM/DD": 0.5, "DD/MM": 0.5}  # ← I know this variable exists
        }                                                    #    I just don't know the value
    
    def update(self, observation):
        # I can update my belief with new evidence
        # because I have a SLOT for the thing I'm uncertain about
        pass

# The risk agent (null uncertainty) has no such slot:

class RiskAgent:
    def __init__(self):
        self.state = {}
        # There is no "date_format" key.
        # There is no belief distribution over it.
        # The concept does not exist here.
        # self.state has no idea that "date_format" is a thing.
    
    def assess_risk(self, trade):
        # Uses trade["date"] as a fact.
        # Not as a belief. Not as an estimate. As a fact.
        date = trade["date"]  # "2026-04-05". Certain. Done. Moving on.
```

The POMDP agent has the right number of dimensions. It knows the shape of its ignorance. It can improve over time. The null-uncertainty agent doesn't even have the wrong number of dimensions — it has a **different dimensionality entirely**. It's not uncertain. It's *unaware*.

---

## Step 5: The concrete cost

Here's what it costs in the trade example.

April 5, 2026 is a Sunday. Markets are closed. If the date is actually April 5th, the correct action is HOLD — you can't trade on a Sunday.

May 4, 2026 is a Monday. Markets are open. If the date is actually May 4th, the correct action is EXECUTE — place the trade.

```python
if actual_date == "April 5 (Sunday)":
    optimal_action = "HOLD"
    
elif actual_date == "May 4 (Monday)":
    optimal_action = "EXECUTE"

# These are DIFFERENT optimal actions.
# System B picks one. It's right 50% of the time.
# It doesn't know it's flipping a coin.
# Its confidence is 100%.
```

The divergence gap — the difference between what System B thinks is optimal and what is actually optimal — is nonzero and computable before System B even runs. You can calculate it from the calendar and the reward function. The gap is a property of the *boundary*, not of the agent.

---

## Step 6: The only fix

```python
# The fix is not inside System B. The fix is a question.

# System B asks System A (or the original sender):
# "What date format was the original input in?"

# This is a ROTATION: turning your attention from your own data
# to the other system's data, and comparing.

# Before the rotation:
system_b_knows = {
    "date": "2026-04-05",  # fact (actually an assumption)
    "format_ambiguity": None  # ← this key doesn't even exist
}

# After the rotation:
system_b_knows = {
    "date": "2026-04-05",
    "original_format": "MM/DD",  # ← acquired from across the boundary
    "format_verified": True       # ← now it's actually a fact
}
```

The rotation costs something: a network call, a database lookup, a Slack message, processing time. It is never free. But the cost of *not* rotating is carrying undetectable wrong answers at 100% confidence.

---

## Step 7: The full picture in one table

| Level | Your code has | You can discover it from inside? | Fix |
|---|---|---|---|
| Known unknown | A variable set to `None` | Yes — you already know it's missing | Fetch the value |
| Unknown unknown | No variable, but you *could* add one | Maybe — a test might fail, an edge case might surface it | Someone points it out, you add the field |
| Null uncertainty | No variable, and nothing inside your system can tell you it should exist | **No** — every internal check passes, every diagnostic says "looks good" | **Ask across the boundary** — pay the cost of a rotation |

---

## Step 8: Why this matters now

When a human analyst gets data from another system and something looks weird, they pick up the phone. "Hey, what does this field mean?" That's an informal rotation. It costs almost nothing. Humans do it automatically.

AI agents don't pick up the phone. They parse the JSON, apply their own defaults, and proceed with 100% confidence. They cross thousands of boundaries per hour. Each unverified crossing is a null-uncertainty exposure. The agent's dashboards all say "everything is fine" — because "everything is fine" and "we have no idea if it's fine" look identical from inside.

```python
# What the dashboard shows in BOTH cases:
{
    "status": "ok",
    "errors": 0,
    "confidence": 1.0,
    "schema_valid": True,
    "anomalies_detected": 0
}

# Case 1: Everything really is fine. The date is correct.
# Case 2: The date is wrong. The trade will execute on the wrong day.
#          A million dollars is at risk.
# 
# Same dashboard. Same outputs. Same "status: ok."
# That's null uncertainty.
```

---

## Summary

**Null uncertainty** is when:
1. Your system is missing a variable it needs.
2. The missing variable lives on the other side of a boundary (another system, another API, another agent).
3. No function your system can compute will ever tell you the variable is missing, because every function operates on your data, and your data looks fine.
4. The only fix is to ask across the boundary — a rotation — and that costs something.

The Bellman equation (the math behind every AI agent that plans ahead) assumes the agent can see everything it needs to make a decision. At system boundaries, that assumption is silently violated. The agent's value function converges to a number. The number is wrong. Every check says it's right. That's where Bellman breaks.
