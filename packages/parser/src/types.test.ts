import { ok } from 'assert';
import { expect } from 'chai';
import { Native } from './types.native.js';
import { Project } from './types.project.js';

describe('GML', function () {
  it('can load the GML spec', async function () {
    const spec = await Native.from();
    expect(spec).to.exist;

    // STRUCTS AND CONSTS
    const track = spec.types.get('Struct.Track');
    ok(track);
    ok(track.kind === 'Struct');

    const name = track.getMember('name');
    ok(name);
    expect(name.type.kind).to.equal('String');

    const visible = track.getMember('visible');
    ok(visible);
    expect(visible.type.kind).to.equal('Bool');

    const tracks = track.getMember('tracks');
    ok(tracks);
    expect(tracks.type.kind).to.equal('Array');
    expect(tracks.type.items!.kind).to.equal('Struct');
    expect(tracks.type.items!.parent!).to.eql(spec.types.get('Struct'));
    expect(tracks.type.items!).to.eql(track);

    const keyframes = track.getMember('keyframes');
    ok(keyframes);
    expect(keyframes.type.kind).to.equal('Array');
    expect(keyframes.type.items!.kind).to.equal('Struct');
    expect(keyframes.type.items!.parent!).to.eql(spec.types.get('Struct'));
    expect(keyframes.type.items!).to.eql(spec.types.get('Struct.Keyframe'));

    const type = track.getMember('type');
    ok(type);
    const expectedTypeType = spec.types.get('Constant.SequenceTrackType');
    ok(expectedTypeType);
    ok(type.type === expectedTypeType);
    ok(expectedTypeType.kind === 'Real');

    // VARIABLES
    const depthSymbol = spec.instance.get('depth');
    ok(depthSymbol);
    expect(depthSymbol.type.kind).to.equal('Real');

    // FUNCTIONS
    const scriptExecuteType = spec.types.get('Function.script_execute');
    const scriptExecuteSymbol = spec.global.get('script_execute');
    ok(scriptExecuteSymbol);
    ok(scriptExecuteSymbol.type === scriptExecuteType);
    ok(scriptExecuteType.kind === 'Function');
    expect(scriptExecuteType.params).to.have.lengthOf(2);
    expect(scriptExecuteType.params![0].name).to.equal('scr');
    expect(scriptExecuteType.params![0].type.kind).to.equal('Union');
    expect(scriptExecuteType.params![0].type.types).to.have.lengthOf(3);
    expect(scriptExecuteType.params![0].type.types![0].kind).to.equal('String');
    expect(scriptExecuteType.params![0].type.types![1].kind).to.equal(
      'Function',
    );
    expect(scriptExecuteType.params![0].type.types![2].kind).to.equal(
      'Asset.GMScript',
    );
    expect(scriptExecuteType.params![1].name).to.equal('...');
  });

  it('can has fallback GmlSpec', async function () {
    await Project.fallbackGmlSpecPath.exists({ assert: true });
  });

  it('can parse sample project', async function () {
    const projectDir = process.env.GML_PARSER_SAMPLE_PROJECT_DIR;
    ok(
      projectDir,
      'A dotenv file should provide a path to a full sample project, as env var GML_PARSER_SAMPLE_PROJECT_DIR',
    );
    const project = await Project.initialize(projectDir);
  });
});
