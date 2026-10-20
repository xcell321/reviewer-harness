---
name: review
description: I-review ang katapusang kausaban batok sa harness rules ug memory.
---

I-review ang katapusang kausaban niini nga project (git diff, o ang files nga bag-o lang gi-edit).

I-check:
1. Naa bay giusab nga wala gisugo, o file nga gi-rewrite imbis gi-edit lang?
2. Naa bay import, function, o API nga wala sa codebase o sa package.json (hallucination)?
3. Nalapas ba ang bisan unsa sa memory/ (mga desisyon o "ayaw hilabti")?
4. Gi-run ba ang tests/lint human sa kausaban?

Pokos: $ARGUMENTS

I-report isip VIOLATION / WARNING. Kung limpyo, isulti nga limpyo.
