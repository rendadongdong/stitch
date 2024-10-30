# Stitch for VSCode

Edit your [GameMaker](https://gamemaker.io/en) projects in VSCode! This extension provides Intellisense and other features for GameMaker projects.

**_👀 Watch the [video tutorial](https://www.youtube.com/watch?v=N0wnHauUQjA)! 👀_**

_Read about recent changes in the [changelog](https://github.com/bscotch/stitch/blob/develop/packages/vscode/CHANGELOG.md)._

**Careful!** Stitch is able to make large-scale, irreversible changes to GameMaker projects. Make sure you're using source control!

_Stitch and its logo are trademarks of [Butterscotch Shenanigans](https://www.bscotch.net) (a.k.a. "Bscotch"). Stitch and Bscotch are unaffiliated with GameMaker._

## 🤔 Why?

We've used GameMaker for the entire 12+ year history of [our studio](https://www.bscotch.net). While the GameMaker IDE has been rapidly improving, VSCode is able to improve even faster due to its enormous community, extensions API, and use of popular web technologies. We wanted to take advantage of those things to make our GameMaker development experience as good as possible.

## 💖 Show your support!

There are a lot of ways you can support this project:

- Help keep our studio running by [wishlisting our latest game](https://store.steampowered.com/app/1401730?utm_source=stitch-vscode-readme&utm_term=tools&utm_content=support-cta), Crashlands 2, on Steam.
- Help keep our studio running by [buying any of our games](https://www.bscotch.net/games).
- Submit [bug reports and feature requests](https://github.com/bscotch/stitch/issues)
- [Contribute directly to this project](https://github.com/bscotch/stitch/blob/develop/CONTRIBUTING.md)

## 💡 Features

### 🤖 Intellisense

Stitch provides Intellisense (auto-complete, hovertext, function signature helpers, go-to-definition, find-references, etc) for all built-in and user-defined symbols.

### 📛 Renaming

Since Stitch knows about all of your project's symbols, it can also rename them for you! Use the hotkey (`F2` by default) or the right-click context menu to "Rename" a symbol. You can also rename assets via the tree view (while maintaining parent/child relationships). Stitch will auto-rename all references to the symbol, including in JSDoc comments.

> ⚠️ Note that it's possible to write GML code where references to the same symbol are not discoverable by static analysis tools like Stitch, so you may need to do some manual cleanup after renaming.

### 🪶 Feather and Type Support

GameMaker includes a type system called "Feather", which Stitch builds upon. Stitch does take a different overall approach and provides some extensions to the Feather type system and additional features that are not currently available in GameMaker.

- **Go to Type Definition:** Stitch implements the "Go To Type Definition" command, letting you quickly get from a variable to e.g. the constructor for its type.
- **Declarations FTW:** Unlike Feather, Stitch only infers types at the time an identifier is _declared_. When a variable is declared without assignment, Stitch will infer its type using the first assignment it sees, but that might result in surprises! For best results, use the `@type` JSDoc tag to specify the type of a variable when it is declared if there is any ambiguity. (Typescript and JavaScript+JSDoc programmers will be familiar with this approach.)
- **Union Type Support:** Feather technically supports "union" types (e.g. `String|Number`), but with limitations. Stitch tries to provide more robust support for union types, though this is a work in progress.
- **`InstanceType<>`, `ObjectType<>`:** Stitch provides custom "Utility Types" that you can use to get one type from another. For example, `InstanceType<Asset.GMObject.my_object>` evaluates to `Id.Instance.my_object`.
- **`@self` tag for `with` statements:** the `with` statement changes the scope of your code, but Feather does not provide a way to tell it what that scope should be. Stitch allows you to use the `@self` (or `@context`) tag before a `with` statement to specify its context for cases where inference is insufficient:
  ```js
  /// @self {Struct.Player}
  with (player) {
    // ...
  }
  ```
- **`@self` support for Function types:** Normally the `@self` tag should have its type set to something with-able, like a Struct, Instance, or Object type. Stitch also allows using function types -- if that function is a constructor the constructed type will be used as the context, otherwise the function's context will be used.
  ```js
  /// @self {Function.my_func}
  function do_stuff() {
    // ...
  }
  ```
- **`@type` tag:** Stitch supports the [JSDoc `@type` tag](https://jsdoc.app/tags-type.html), which allows you to specify the type of a symbol inline in a JSDoc comment. Just use it right before a symbol declaration:
  ```js
  /// @type {Array<String>}
  var strings = [];
  ```
- **`@localvar`, `@globalvar`, `@instancevar`:** Stitch supports custom JSDoc tags for declaring local, global, and instance variables. These are useful for declaring variables that are not otherwise declared in your code, for example dynamically created variables:
  ```js
  /// @globalvar {Array<String>} MY_STRINGS
  var strings = MY_STRINGS; // Stitch will not error on this reference
  ```
- **`@template` tag:** Stitch provides basic generics support through the JSDoc `@template` tag. This feature lets you get more specific inferred return types from functions. It optionally takes a type parameter, which will eventually be used for type-checking. Examples:

  ```js
  /// @template T
  /// @param {T} value
  /// @returns {T}
  function identity(value) {
    return value;
  }
  var str = identity('hello'); // str get type "String"
  var num = identity(42); // num gets type "Real"

  /// @description When this function is called, the return type will be an `Id.Instance` for the same object as the argument.
  /// @template  {Asset.GMObject} T
  /// @param {T} obj
  /// @returns {InstanceType<T>}
  function instance_create(obj) {
    /*...*/
  }
  var inst = instance_create(my_object); // inst gets type "Id.Instance.my_object", assuming my_object is an object ID.
  ```

- **`@mixin`:** Stitch provides the `@mixin` tag to indicate that a function will be called inside of constructor/create contexts in order to add variables to the caller. Any context that calls such a function will have those variables added to its `self`, providing editor support for this pattern:
  ```js
  /// @mixin
  function add_variables() {
    added_variable = 42;
  }
  ```
- **JSDoc Autocompletes:** Stitch provides autocompletes and syntax highlighting for Feather types within JSDoc comments.
- **JSDoc helpers:** Stitch provides snippets for JSDoc tags, and context menus to copy the Feather type of a symbol to your clipboard.

### 📄 Included Files ("Datafiles")

In addition to GameMaker-specific Asset types, GameMaker allows you to include arbitrary files in your project (a.k.a. "Included Files"). These are found in the `datafiles` folder for your project.

Since the built-in file Explorer view is fully-featured, that's the best place to manage Included Files (rather than trying to recreate all of that functionality in Stitch).

Stitch adds a few features to make it easier to leverage VSCode's built-in stuff:

- On project load, Stitch forces the project's YYP file to mirror the actual files found in the `datafiles` folder.
- Stitch adds a watcher for changes in the `datafiles` folder, re-syncing to ensure the YYP matches any time there is a change.
- The above items make it so you can manage your Included Files right in VSCode's built-in Explorer view, and Stitch will automatically ensure your changes are reflected in the game project.
- Stitch also includes a read-only Included Files tree in the Stitch sidebar. This gives you a quick view of your Included Files so you don't have to go hunting for them in the Explorer view. Clicking a file will open it in VSCode, and the right-click context menu provides a "Reveal in Explorer View" option to take you to that same file in the Explorer view (making it easy to get to where you can manage that file).

### 🎁 Creating assets

Stitch provides some support for creating new assets, but only for a few asset types. For any others, or for additional features, you'll need to use the GameMaker IDE.

You can enforce naming conventions for new assets by adding a `stitch.config.json` file alongside your project's `.yyp` file. VSCode provides autocompletes and hovertext for keys in that file.

The following is a sample config file that ensures new sprites are prefixed with `sp_`, sounds are prefixed with one of `mus_`, `amb_`, or `sfx_`, and also automatically sets new sounds to the appropriate mono/stereo setting based on their names:

```json
{
  "newSpriteRules": {
    "allowedNames": ["^sp_"]
  },
  "newSoundRules": {
    "allowedNames": ["^mus_", "^amb_", "^sfx_"],
    "defaults": {
      "^(mus|amb)_": {
        "mono": false
      },
      "^sfx_ui_": {
        "mono": false
      },
      "^sfx_": {
        "mono": true
      }
    }
  }
}
```

Supported asset types include:

#### Sprites

There are several ways to manage Sprite assets in Stitch:

- Drag-drop external images into a folder to create a new Sprite for each dropped image, named the same as the source file.
- Drag-drop external images onto an existing Sprite to add them as frames.
- Drag-drop frames within a Sprite to organize them relative to each other.
- Use the `"New Sprite..."` context menu option of asset tree folders to create a new Sprite from a _folder of frames_. This also gives you the option to crop and bleed the frames. The frame order will match the alphanumeric sort order of the source images. Beyond that, it doesn't matter what your source image names are!
- Use the `"Replace Frames..."` context menu option of and existing Sprite to force its frames to match a source folder of frames (same idea as `"New Sprite..."`)

#### Sounds

There are several ways to manage Sound assets in Stitch:

- Drag-drop external audio files into a folder to create Sounds for each dropped file. (Sounds matching an existing asset name will be udpated instead of duplicated!)
- Use the `"New Sound..."` context menu option of asset tree folders to create a new Sound from an audio file.

#### Scripts

You can create new Scripts from the context menu of folder items.

#### Objects

You can create new Objects from the context menu of folder items, and you can create new Object events from the context menu of an Object's tree entry.

#### Shaders

You can create new Shaders from the context menu of folder items. This will generate `vsh` and `fsh` files with the same default content that the GameMaker IDE provides.

### 📦 Import assets from other projects

> ⚠️ This feature is experimental!

Stitch provides the "Stitch: Import Assets" command via the palette, which lets you import an asset or a folder of assets from another GameMaker project.

Since Stitch knows about all of your assets and code, it can identify possible conflicts during an import and let you choose how to resolve them.

### 🔍 Navigating your project

Stitch provides a tree view that mirrors the project resources in the GameMaker IDE. You can open it by clicking the Stitch icon in the Activity Bar. From there you can filter and open resources, add new ones, reorganize things, and so on.

Stitch also provides support for symbol search <kbd><kbd>Ctrl</kbd>+<kbd>T</kbd></kbd> via the command palette, which finds where all of your project's globals are defined. It will also pull up your asset and your object events, so you can find everything in one place.

Finally, the Intellisense features (go-to-definition, find-references, etc) make it easy to navigate the code in your project.

### 🦋 Syntax highlighting

Stitch provides context-aware "semantic highlighting" for all symbols.

Depending on your VSCode Theme, you may need to enable semantic highlighting to get the full effect. Additionally, you may want to tweak the colors for the different symbol types.

Stitch provides themes that already include semantic highlighting support. Try them out by opening the command palette and searching for "Preferences: Color Theme", then selecting one of the "Stitch" themes.

Here's an example of how you might update your `settings.json`:

```json
{
  //... other settings
  "editor.semanticTokenColorCustomizations": {
    "[Default Dark Modern]": {
      // the theme you're using
      "enabled": true, // enable semantic highlighting
      "rules": {
        "macro": "#A600FF",
        "enum": "#FF0055",
        "enumMember": "#e97400",
        // Instance and struct variables
        "property": "#FF00A5",
        "property.static": "#FFF899",
        "variable.local": "#00FFFF",
        "parameter": "#10c3eb",
        // Built-in variables and constants
        "variable.defaultLibrary": "#58E55A",
        // Your project's global variables
        "variable.global": "#96FF4C",
        // Built-in functions
        "function.defaultLibrary": "#FFB871",
        // Asset identifiers (like sprite IDs)
        "variable.asset": "#d9760c"
      }
    }
  },
  "editor.tokenColorCustomizations": {
    // Regular (non-contextual) syntax highlighting
    "[Default Dark Modern]": {
      "comments": "#7d7d7d",
      "strings": "#FFFF00",
      "numbers": "#FFFF00"
      // etc.
    }
  }
  //... other settings
}
```

### 🎨 Stitch Icon Theme

Stitch provides an Icon Theme based on a subset of [Material Icon Theme](https://github.com/PKief/vscode-material-icon-theme), with support for GameMaker files and common non-GameMaker filetypes.

To use it, use <kbd><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd></kbd> to open the command palette, search for "Preferences: File Icon Theme", then select "Stitch Icons". You can also set it as your default icon theme in your VSCode settings.

### 🚀 Running your project

Hit <kbd>F5</kbd> to run your project, just like you would in the GameMaker IDE. Stitch uses the Runtime version that matches the IDE version your project uses. A terminal will pop up with the output from the GameMaker runtime.

Check out Stitch settings to configure how your project is run. In particular:

- `stitch.run.defaultConfig`: Choose a run configuration to use as the default (defaults to "Default")
- `stitch.run.defaultCompiler`: Choose whether to use the VM or YYC compiler (defaults to "VM")
- `stitch.run.inTerminal`: By default Stitch opens a terminal in VSCode and runs your project there, using your default terminal settings. Set this to `false` to use the Stitch Runner Panel instead.

#### ⚡ Stitch Runner Panel

If you enable the Stitch Runner Panel (setting `stitch.run.inTerminal` to `false`), Stitch will run your project behind the scenes and output logs to the "Runner" panel in the Stitch sidebar. The advantages to doing this are that you can: (1) avoid some edge cases with the VSCode terminal, (2) get color highlighting, (3) enable clicking stack trace locations to open them in the code.

The main reasons _not_ to use the Stitch runner are: (1) it does a lot of extra processing, so it's slow if you have a lot of logs; (2) it applies styling to logs, so it might not show you the _exact_ contents of your logs.

![Sample of color-highlighted logs in the Stitch Runner.](https://raw.githubusercontent.com/bscotch/stitch/44cbc24acf6c7686611de7ef3619b00b71cba09b/packages/vscode/images/stitch-log-colors.jpg)

GameMaker doesn't have a standard logger format, so if you want color coding of your log messages you'll have to know some regex and CSS, and do a little configuration.

To add color-coding in the Stitch Runner Panel you'll be adding CSS styles and patterns to the Stitch Config file:

1. Create `stitch.config.json` as a sibling of your project's `.yyp` file, if it doesn't already exist.
2. Open `stitch.config.json` in VSCode. If you have this extension running you'll get Intellisense for configuration values!
3. Add the `"gameConsoleStyle"` field if it doesn't already exist.
4. Inside the `"gameConsoleStyle"` object:

- Optionally add a `"base"` style, which will serve as your base styling. For example, `"base": "color:#808080;font-weight:bold;"` would make all text bold and gray by default.
- Optionally add a collection of line-matchers via the `"line"` field. Each log line will be tested against each of these patterns, and the first pattern to match will get used for styling.

<details>

<summary>See the settings that provided the color highlighting shown in the screenshot above:</summary>

```jsonc
  // in `stitch.config.json`
  "gameConsoleStyle": {
    "base": "color:#808080;",
    "lines": [
      {
        "pattern" : "^Warning : reference to extension macro",
        "base" : "color:#808080;"
      },
      {
        "pattern" : "^WARNING: Could not find any events",
        "base" : "color:#808080;"
      },
      {
        "pattern" : "^WARNING: Could not find animation",
        "base" : "color:#808080;"
      },
      {
        "pattern" : "^Pause event has been",
        "base" : "color:#4A4A4A;"
      },
      {
        "pattern" : "is cropped, sprites used by Spine must be uncropped$",
        "base" : "color:#808080;"
      },
      {
        "pattern": "\\berror\\b",
        "base": "color: #FF0000; font-weight: bold;"
      },
      {
        "pattern": "\\bwarn(ing)?\\b",
        "base": "color: #FFD900"
      },
      {
        "base": "color: #808080;",
        "description": "Bscotch Echo",
        "pattern": "^(?<entity>(?<struct>struct)|(?<constructor>Struct\\.(?<constructorName>[^|]+))|(?<rumpus>o_rumpus[^|]+)|(?<http>o_http_controller)|(?<object>o_[^|]+))\\|(?<time>[^|]+)\\| (?<message>.*)",
        "styles": {
          "message": "color:white;",
          "constructor" : "color: #4FE2C2",
          "object" : "color: #FF9D00",
          "struct" : "color:cyan",
          "rumpus" : "color:#0095FF",
          "http" : "color:#0095FF"
        }
      }
    ]
  }
```

</details>

### 📝 Opening the correct GameMaker version

Stitch provides context-menu entries and a command palette command (`Stitch: Open in GameMaker`) to open your project in the GameMaker IDE. It will ensure that you're always using the same version of GameMaker to open your projects, even automatically installing the correct version if you don't already have it!

Stitch also provides commands for viewing the GameMaker release notes and setting the GameMaker IDE version to use for the active project (`Stitch: Set GameMaker Version`).

## ⚙️ Supported GameMaker versions

Stitch supports projects that use recent versions of GameMaker, and makes no effort to support older versions.

It may not support _very_ recent versions, since we only add support once we bump the version of GameMaker we're using for our games. We only do that when new versions pass all of our tests -- sometimes that doesn't happen for a while.

Different GameMaker versions may have different features and built-in functions, constants, etc. This extension tries to infer the correct features for your project's GameMaker version, but it might give you incorrect autocompletes or surprising command outcomes if it cannot find a match!

## 📦 Recommended Extensions

The nice thing about being in the VSCode ecosystem is that there are TONS of other great extensions out there! Here are some we recommend to get the most out of using VSCode for your GameMaker projects:

- [Font Preview](https://marketplace.visualstudio.com/items?itemName=ctcuff.font-preview): an interactive preview for your font files, right in VSCode!
- [Change Case](https://marketplace.visualstudio.com/items?itemName=wmaurer.change-case): quickly change the casing of some selected text. Includes all of the common code-casing strategies.
- [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker): Exactly what it sounds like! Smart enough to handle spellchecking for code. Best used with a per-project dictionary.
- [TabOut](https://marketplace.visualstudio.com/items?itemName=albert.TabOut): Make keyboard navigation easier with a smarter tab key.
- [vscode-color-picker](https://marketplace.visualstudio.com/items?itemName=AntiAntiSepticeye.vscode-color-picker): Use a color picker to set colors in code instead of typing them out! To get it working in GML, edit its settings to add `"gml"` to the languages list and replace calls to `make_color_rgb` with a new macro: `#macro rgb make_color_rgb`

## 🤔 Tips, Limitations, and Known Issues

To see the current list of known issues and feature requests, check out the [issues page](https://github.com/bscotch/stitch/issues?q=is%3Aopen+is%3Aissue+label%3A%22%3Akeyboard%3A+vscode%22).

- 😕 **Code only**. Stitch leverages VSCode's power for editing _code_, and makes no attempt to provide visual editors for any type of GameMaker asset.
- 😕 **Macro limitations**. The Stitch parser can only handle macros that are set to simple and complete expressions. There are no plans to extend the parser to support more complex macro usage.
- 😕 **Variable Definitions** via the UI are not supported. Since instance variables can be defined in code (via Creation events) we don't also support defining them via the "Variable Definitions" feature of Objects. If for some reason you need that feature, please provide context on the [associated issue](https://github.com/bscotch/stitch/issues/205)!
- 😕 **Extraneous Curlies**. To avoid some parser complexity, the Stitch parser does not support extraneous curly braces (`{}`). For example, if a random section of code (not following a `for`, `if`, etc) is wrapped in curlies, the parser will emit errors.
- 😕 **IIFFEs**. Stitch does not support IIFEs (immediately-invoked function expressions), e.g. `(function(){})()`. This is due to parser complexity, but pull requests addressing this are welcome!
- 📝 **Stitch settings**. Stitch provides a number of settings that you can use to customize your experience. You can find them by opening the command palette and searching for "Preferences: Open Settings".
- 🪵 **How to view logs**. If you run into trouble, you can view the extension's logs by opening the Output panel and selecting "Stitch" from the dropdown menu. These are particularly helpful for providing context when leaving bug reports!
- ⁉️ **Unexpected projects appear in the tree view**. If you're seeing extra projects in your tree view, it's likely that these are being discovered inside `node_modules` or other normally-hidden locations. Stitch excludes the same files that your VSCode setup does via the `files.exclude` setting, so if you want to prevent those projects from appearing add their parent folders to your excluded files.
