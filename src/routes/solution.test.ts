import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isCorrectAnswer, validateSolution } from '../lib/solution'

describe('isCorrectAnswer', () => {
    it('returns true for an exact match', () => {
        assert.equal(isCorrectAnswer('Jeremy Bowers', 'Jeremy Bowers'), true)
    })

    it('is case-insensitive', () => {
        assert.equal(isCorrectAnswer('jeremy bowers', 'Jeremy Bowers'), true)
        assert.equal(isCorrectAnswer('JEREMY BOWERS', 'Jeremy Bowers'), true)
        assert.equal(isCorrectAnswer('Jeremy Bowers', 'jeremy bowers'), true)
    })

    it('trims surrounding whitespace on both sides', () => {
        assert.equal(isCorrectAnswer('  Jeremy Bowers  ', 'Jeremy Bowers'), true)
        assert.equal(isCorrectAnswer('Jeremy Bowers', '  Jeremy Bowers  '), true)
    })

    it('returns false for a different name', () => {
        assert.equal(isCorrectAnswer('John Doe', 'Jeremy Bowers'), false)
    })

    it('returns false when the expected answer is null', () => {
        assert.equal(isCorrectAnswer('Jeremy Bowers', null), false)
    })

    it('returns false when the submission differs only by internal whitespace', () => {
        assert.equal(isCorrectAnswer('Jeremy  Bowers', 'Jeremy Bowers'), false)
    })
})

describe('validateSolution', () => {
    it('returns a friendly message and no hint for an empty string', async () => {
        const result = await validateSolution('')
        assert.equal(result.correct, false)
        assert.equal(result.hint, undefined)
        assert.match(result.message, /campo "name"/i)
    })

    it('returns a friendly message and no hint for whitespace-only string', async () => {
        const result = await validateSolution('   ')
        assert.equal(result.correct, false)
        assert.equal(result.hint, undefined)
        assert.match(result.message, /campo "name"/i)
    })

    it('returns a congratulatory message with the assassin name from the database', async () => {
        const result = await validateSolution('Jeremy Bowers')
        assert.equal(result.correct, true)
        assert.equal(result.role, 'assassino')
        assert.equal(result.hint, undefined)
        assert.match(result.message, /Parabens/i)
        assert.match(result.message, /Jeremy Bowers/)
    })

    it('accepts the correct name regardless of case and surrounding whitespace', async () => {
        const result = await validateSolution('  jeremy bowers  ')
        assert.equal(result.correct, true)
        assert.equal(result.role, 'assassino')
        assert.match(result.message, /Jeremy Bowers/)
    })

    it('returns a congratulatory message with the mastermind name from the database', async () => {
        const result = await validateSolution('Miranda Priestly')
        assert.equal(result.correct, true)
        assert.equal(result.role, 'mandante')
        assert.equal(result.hint, undefined)
        assert.match(result.message, /Parabens/i)
        assert.match(result.message, /Miranda Priestly/)
    })

    it('accepts the mastermind name regardless of case and surrounding whitespace', async () => {
        const result = await validateSolution('  miranda priestly  ')
        assert.equal(result.correct, true)
        assert.equal(result.role, 'mandante')
        assert.match(result.message, /Miranda Priestly/)
    })

    it('returns a friendly message with a hint for an incorrect name', async () => {
        const result = await validateSolution('John Doe')
        assert.equal(result.correct, false)
        assert.equal(result.role, undefined)
        assert.ok(result.hint, 'expected a hint on wrong answer')
        assert.match(result.message, /Quase la|incorret|nome submetido/i)
        assert.match(result.hint, /Dica/i)
    })

    it('does not leak the correct answer in the hint when wrong', async () => {
        const result = await validateSolution('John Doe')
        assert.ok(result.hint)
        assert.doesNotMatch(result.hint, /Jeremy Bowers/)
        assert.doesNotMatch(result.hint, /Miranda Priestly/)
        assert.doesNotMatch(result.message, /Jeremy Bowers/)
        assert.doesNotMatch(result.message, /Miranda Priestly/)
    })
})
