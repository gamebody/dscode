import path from 'path';
import fs from 'fs';

const resolveAtReferences = (text: string, cwd: string): string => {
    return text.replace(/@(\S+)/g, (match, p1) => {
        if (path.isAbsolute(p1)) return match;
        const absPath = path.resolve(cwd, p1);
        try {
            if (fs.existsSync(absPath)) {
                return `@${absPath}`;
            }
        } catch { }
        return match;
    });
};

export default resolveAtReferences;