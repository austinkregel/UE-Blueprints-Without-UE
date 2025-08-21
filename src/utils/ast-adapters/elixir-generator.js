// IR -> Elixir code generator (string-based)
// Notes: Elixir is immutable and lacks C-style loops; we map for_range to Enum.each over ranges.

export function generateElixir(ir) {
    const lines = [];
    const emit = (s = '') => lines.push(s);

    function expr(e) {
        switch (e?.kind) {
            case 'int':
                return String(e.value | 0);
            case 'float':
                return String(e.value);
            case 'string':
                return JSON.stringify(String(e.value));
            case 'bool':
                return e.value ? 'true' : 'false';
            case 'null':
                return 'nil';
            case 'ident':
                return e.name;
            case 'array':
                return `[${(e.elements || []).map(expr).join(', ')}]`;
            case 'map': {
                const pairs = (e.entries || []).map(({key, value}) => `${expr(key)} => ${expr(value)}`);
                return `%{${pairs.join(', ')}}`;
            }
            case 'call': {
                const callee = typeof e.callee === 'string' ? e.callee : expr(e.callee);
                return `${callee}(${(e.args || []).map(expr).join(', ')})`;
            }
            case 'binop':
                return `(${expr(e.left)} ${e.op} ${expr(e.right)})`;
            default:
                return 'nil';
        }
    }

    function stmt(s, indent = '') {
        switch (s.kind) {
            case 'assign':
                // Simple rebinding; in real code, this lives in a scope (fn or pipeline)
                emit(`${indent}${s.target.name} = ${expr(s.value)}`);
                break;
            case 'print':
                emit(`${indent}IO.puts(${expr(s.value)})`);
                break;
            case 'return':
                // There is no "return" outside def/fn; we just emit the expression or :ok
                emit(`${indent}${s.value ? expr(s.value) : ':ok'}`);
                break;
            case 'expr':
                emit(`${indent}${expr(s.value)}`);
                break;
            case 'function': {
                const params = (s.params || []).join(', ');
                emit(`${indent}def ${s.name}(${params}) do`);
                if (s.body?.length) s.body.forEach((n) => stmt(n, indent + '  '));
                else emit(indent + '  :ok');
                emit(`${indent}end`);
                break;
            }
            case 'if':
                emit(`${indent}if ${expr(s.cond)} do`);
                if (s.then?.length) s.then.forEach((n) => stmt(n, indent + '  '));
                else emit(indent + '  :ok');
                if (s.else?.length) {
                    emit(`${indent}else`);
                    s.else.forEach((n) => stmt(n, indent + '  '));
                }
                emit(`${indent}end`);
                break;
            case 'while': {
                // Emulate while with recursion in a local named function
                const fname = s.__gensym || 'loop';
                emit(`${indent}${fname} = fn ->`);
                emit(`${indent}  if ${expr(s.cond)} do`);
                if (s.body?.length) s.body.forEach((n) => stmt(n, indent + '    '));
                else emit(indent + '    :ok');
                emit(`${indent}    #{ re-run }#`);
                emit(`${indent}    apply(${fname}, [])`);
                emit(`${indent}  else`);
                emit(`${indent}    :ok`);
                emit(`${indent}  end`);
                emit(`${indent}end`);
                emit(`${indent}apply(${fname}, [])`);
                break;
            }
            case 'foreach': {
                const v = s.var || 'item';
                emit(`${indent}Enum.each(${expr(s.iterable)}, fn ${v} ->`);
                if (s.body?.length) s.body.forEach((n) => stmt(n, indent + '  '));
                else emit(indent + '  :ok');
                emit(`${indent}end)`);
                break;
            }
            case 'for_range': {
                const start = expr(s.start);
                const end = expr(s.end);
                // Elixir ranges are inclusive; mirror end-exclusive by using (end - 1)
                emit(`${indent}Enum.each(${start}..(${end} - 1), fn ${s.var} ->`);
                if (s.body?.length) s.body.forEach((n) => stmt(n, indent + '  '));
                else emit(indent + '  :ok');
                emit(`${indent}end)`);
                break;
            }
            default:
                emit(indent + '# unsupported stmt');
        }
    }

    ir?.statements?.forEach((s) => stmt(s));
    if (lines.length === 0) emit(':ok');
    return lines.join('\n');
}
