/* https://gist.github.com/rooks/6a13affb544ef8bc338b49af7d018318 */

/*
const DELIM = ','
const QUOTE = '"'

const MAX_LENGTH = 9
const tokenRainbow = state => `string num${state.num}`
const tokenPlain = () => 'string'

CodeMirror.defineMode('csv', function modeCsv(opts, modeOpts) {
    let { delimiter = DELIM, rainbow = false } = modeOpts
    let token = rainbow ? tokenRainbow : tokenPlain

    function tokenMain(stream, state) {
        if (stream.sol()) {
            state.num = 0
        }

        let ch = stream.next()

        if (ch === QUOTE) {
            state.tokenize = tokenQuotes
            return token(state)
        }

        if (ch === delimiter) {
            state.num = (state.num + 1) % MAX_LENGTH
            return 'delim'
        }

        return token(state)
    }

    function tokenQuotes(stream, state) {
        let ch = stream.next()
        if (ch === QUOTE) {
            let next = stream.peek()
            // escaped quotaion mark
            if (next === QUOTE) {
                stream.next()
            }
            // end of the record
            else {
                state.tokenize = tokenMain
            }
        }

        return token(state)
    }

    return {
        startState() {
            return {
                num: 0,
                tokenize: tokenMain
            }
        },
        token(stream, state) {
            let style = state.tokenize(stream, state)
            return style
        }
    }
})*/