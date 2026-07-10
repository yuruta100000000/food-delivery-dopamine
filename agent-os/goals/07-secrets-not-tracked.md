# goal: secrets-not-tracked

.env.local(OPENAI_API_KEY等)がgitで追跡されていない。

predicate: git check-ignore -q .env.local && ! git ls-files --error-unmatch .env.local >/dev/null 2>&1
timeout: 10
severity: blocker
