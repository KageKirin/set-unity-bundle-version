
const fs = require('fs');
const yaml = require('js-yaml');
const core = require('@actions/core');

const file = core.getInput('file');
const regex = core.getInput('regex');
const version = core.getInput('version');


/// run
async function run()
{
    try
    {
        const [doc, schema] = parse_unityfile(file);
        console.dir(doc)
        if (doc[0].PlayerSettings.bundleVersion)
        {
            const ver = parse_version(doc[0].PlayerSettings.bundleVersion);
            if (ver)
            {
                doc[0].PlayerSettings.bundleVersion = version;
// FIX THIS
                fs.writeFileSync(file, JSON.stringify(pkg, null, '  ') + '\n');
            }
            else
            {
                core.setFailed(`failed to parse ${file} bundleVersion`);
            }
        }
        else
        {
            core.setFailed(`invalid ${file} does not contain version`);
        }

        // read back
        const doc2 = parse_unityfile(file);
        if (doc2[0].PlayerSettings.bundleVersion)
        {
            const ver = parse_version(doc2[0].PlayerSettings.bundleVersion);
            if (ver)
            {
                core.setOutput('version', doc2[0].PlayerSettings.bundleVersion);
            }
            else
            {
                core.setFailed(`failed to parse ${file} version`);
            }

            if (doc2[0].PlayerSettings.bundleVersion === doc[0].PlayerSettings.bundleVersion)
            {
                // no issues
            }
            else
            {
                core.setFailed("readback version different from input version");
            }
        }
        else
        {
            core.setFailed(`invalid ${file} does not contain version`);
        }
    }
    catch (error)
    {
        core.setFailed(error.message);
    }
}

function parse_version(version)
{
    const match = version.match(regex);
    if (match)
    {
        console.dir({groups: match.groups});
        return [match.groups.major, match.groups.minor, match.groups.patch, match.groups.prerelease, match.groups.buildmetadata];
    }
    return null
}

/*async */function parse_unityfile(path)
{
    const types = {};
    let file = /*await fs.promises.readFile(path, 'utf8');*/ fs.readFileSync(path, 'utf8');

    // remove the unity tag line
    file = file.replace( /%TAG.+\r?\n?/, '' );

    // replace each subsequent tag with the full line + map any types
    file = file.replace( /!u!([0-9]+).+/g, ( match, p1 ) => {
        // create our mapping for this type
        if ( !( p1 in types ) )
        {
            const type = new yaml.Type( `tag:unity3d.com,2011:${p1}`, {
                kind: 'mapping',
                construct: function ( data ) {
                    return data || {}; // in case of empty node
                },
                instanceOf: Object
            } );
            types[p1] = type;
        }

        return `!<tag:unity3d.com,2011:${p1}>`
    });

    // create our schema
    const schema = yaml.DEFAULT_SCHEMA.extend(Object.values(types));

    // parse our yaml
    const objAr = yaml.loadAll(file, null, { schema });

    return [objAr, schema];
}

run()
