/// @desc This is a multiline
///       description.
/// @param {String} first This is the first parameter
/// @param {Real} second This is the second parameter,
///        which spans multiple lines.
/// @param {Struct} [maybe] This parameter is optional
/// @param {String} [...] And so is this one, but there can be as many as you want!
/// @returns {Struct} And here is a multiline
///  description of the return type.
/// @self Struct.AnotherConstructor
/// @deprecated
function Jsdocs(){
  /// This one is a string
  /// @type {String}
	var a_string;
	
  /** This one is a Real
   * @type {Real}
   */
	var a_real;
}

/**
 * @desc This is a multiline
 *       description.
 * @param {String} first This is the first parameter
@param {Real} second This is the second parameter,
 *        which spans multiple lines and does not
          start every line with an asterisk.
 * @param {Struct} [maybe] This parameter is optional
 * @param {Bool} [...] And so is this one, but there can be as many as you want!
 * @returns {Struct} And here is a multiline
 *  description of the return type.
 * @self Struct.AnotherConstructor */
function JsdocsJsStyle(first, second){
}

/// @localvar {String} a_local_var With a description!
/// @globalvar {Any} a_global OH NOOO
/// @globalvar {Real} another_global_var With a description!

var a_string = "Hello, world!";
/// Described variable without a type annotation
var another_string = "Hello, world!";
