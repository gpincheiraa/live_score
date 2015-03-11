live_score      = require("./live_score.js");
live_score.Note = require("./note.js");

/**
* Measure
*   The constructor for the Measure object.
* args
*   measure_meta_data
*     the measure_meta_data, described in structs.js, for this measure
* returns
*   none
*/
live_score.Measure = function(measure_meta_data){

  /**
  * the number of beats in the measure, can be thought of as the numerator of
  * the measure's time signature.
  */
  this.num_beats = measure_meta_data.num_beats;

  /**
  * the length value of the beats in num_beats, can be thought of as the 
  * denominator of the measure's time signature
  */
  this.beat_value = measure_meta_data.beat_value;

  /**
  * an array of live_score.Note objects, representing the notes that are played
  * in this measure
  */
  this.notes = [];

  /**
  * a tick is used to determine rhythmic positioning of notes in a measure.
  * this determines the number of ticks in this measure, based on the time
  * signature
  */
  this.num_ticks = this.num_beats * live_score.note_length_to_ticks(
    this.beat_value);

  this.create_empty_measure();
};

/**
* create_empty_measure
*   Creates a measure whose length is based on measure_meta_data information,
*   and the measure is filled with rests
* args
*   none
* returns
*   none
*/
live_score.Measure.prototype.create_empty_measure = function(){
  
  var rests = this.fill_space_with_rests(0,this.num_ticks);
  for(var i = 0; i < rests.length; i++){
    this.notes.push(rests[i]);
  }
};

/**
* fill_space_with_rests
*   given a length of time in ticks, this fills that space with rests in 
*   such a way that makes musical sense
* args
*   start_tick
*     the starting position of the space that needs to be filled
*   end_tick
*     the ending position of the space that needs to be filled
* returns
*   rests
*     an array of rests that optimally fills the given space
*/
live_score.Measure.prototype.fill_space_with_rests = function(start_tick,
  end_tick){
  var rests = [];
  var ticks_so_far = start_tick;
  var ticks_left = end_tick - start_tick;
  while(ticks_left > 0){
    var beat_level = this.calculate_beat_level(ticks_so_far);
    var rest_length = this.optimal_rest_length(beat_level, ticks_left);
    ticks_left = ticks_left - live_score.note_length_to_ticks(rest_length);
    rests.push(new live_score.Note(live_score.rest_pitch,rest_length,
      live_score.rest_type));
  }
  return rests;
};

/**
* calculate_beat_level
*   given a number of ticks, determines the beat on which the that tick is
*   this makes sure that highest value note that can appear on a given beat
*   is the same as that beat. e.g. a quarter note would not appear on the
*   third sixteenth note beat of a measure.
* args
*   total_ticks
*     the position of the beat in the measure, in ticks
* returns
*   beat_level
*     the largest note/rest that can appear at the location denoted by
*     total_ticks
*/
live_score.Measure.prototype.calculate_beat_level = function(total_ticks){
  var beat_level = this.num_ticks;
  for(var note_name in live_score.note_lengths){
    var note_length = live_score.note_lengths[note_name];
    var ticks = live_score.note_length_to_ticks(note_length);
    if(total_ticks % ticks === 0 &&
       note_length < beat_level  &&
       ticks <= this.num_ticks){
      beat_level = note_length; 
    }
  }
  return beat_level;
};

/**
* optimal_rest_length
*   given the largest possible rest that can appear and the length of the
*   empty space, determines the optimal rest size to insert
* args
*   beat_position
*     the size of the largest possible rest that can be placed
*   num_ticks
*     the length of the space that needs to be filled
* returns
*   best_fit_note
*     the largest note length that is both within the bounds of the 
*     beat_position and whose length is not larger than num_ticks
*/
live_score.Measure.prototype.optimal_rest_length = function(beat_position,num_ticks){

  var min_tick_difference = this.num_ticks;
  var best_fit_note = null;
  for(var note_name in live_score.note_lengths){
    var note_length = live_score.note_lengths[note_name];
    var note_ticks = live_score.note_length_to_ticks(note_length);
    var tick_difference = num_ticks - note_ticks;
    if(note_length >= beat_position && 
      tick_difference < min_tick_difference &&
      tick_difference >= 0){
      
      min_tick_difference = tick_difference;
      best_fit_note = note_length;
    }
  }
  return best_fit_note;
};

/**
* add_note
*   adds a note to the measure
* args
*   note_info
*     a struct (see structs.js) that contiains information about the
*     note being inserted
* returns
*   a boolean of whether or not the note was inserted successfully 
*/
live_score.Measure.prototype.add_note = function(note_info){
  note_info.quantized_tick_position = this.quantize_position(
    note_info.quantization,note_info.x_position);
  this.place_note_in_measure(note_info);
  return true;
};

/**
* remove_note
*   removes a note from the measure
* args
*   note_info
*     a struct (see structs.js) that contiains information about the
*     note being removed
* returns
*   a boolean of whether or not the note was removed successfully 
*/
live_score.Measure.prototype.remove_note = function(note_info){
  this.remove_note_from_measure(note_info);
  return true;
};

/**
* quantize_position
*   determines the quantized position, in ticks, of a note
* args
*   quantization
*     the beat level to which the note is being quantized
*   position
*     the position of a note in the measure represented as a percentage
* returns
*   quantized_ticks_position
*     the quantized position of the note, in ticks
*/
live_score.Measure.prototype.quantize_position = function(quantization,position){
  
  var quantized_beat_ticks = live_score.note_length_to_ticks(quantization);
  var num_quantized_beats = this.num_ticks/quantized_beat_ticks;
  var position_in_ticks = position*this.num_ticks;
  var quantized_tick_position;
  var min_tick_difference;

  if(num_quantized_beats * quantized_beat_ticks < this.num_ticks){
    quantized_tick_position = num_quantized_beats * quantized_beat_ticks;
    min_tick_difference = Math.abs(this.num_ticks - position_in_ticks);
  }else{
    quantized_tick_position = 0;
    min_tick_difference = this.num_ticks;
  }
  for(var i = 0; i < num_quantized_beats; i++){
    var ticks_before_beat = i * quantized_beat_ticks;
    var tick_difference = Math.abs(ticks_before_beat - position_in_ticks);
    if(tick_difference < min_tick_difference){
      min_tick_difference = tick_difference;
      quantized_ticks_position = ticks_before_beat;
    }
  }
  return quantized_ticks_position;
};

/**
* place_note_in_measure
*   handles all the different cases of how a note can be inserted into 
*   a measure
* args
*   note_info
*     a struct, described in structs.js, with information about the note being
*     inserted
* returns
*   none
*/
live_score.Measure.prototype.place_note_in_measure = function(note_info){
  
  var note_position = note_info.quantized_tick_position;
  var current_position = 0;
  var note_added = false;
  for(var i = 0; i <= this.notes.length && !note_added; i++){
    if(current_position === note_position && this.notes[i].is_note()){
      this.notes[i].add_note(note_info);
      note_added = true;
    }else if(current_position > note_position){
      this.split_rest_and_insert_note(current_position,i-1,note_info);
      note_added = true;
    }else if(current_position === note_position && this.notes[i].is_rest()){
      this.remove_rest_and_insert_note(current_position,i,note_info);
      note_added = true;
    }else{
      var note_length = this.notes[i].length;
      var tick_length = live_score.note_length_to_ticks(note_length);
      current_position += tick_length;
    }
  }
};

/**
* remove_rest_and_insert_note
*   handles the insert case where a note is placed where a rest currently is
* args
*   current_position
*     the position of the rest that is being removed
*   note_to_split_index
*     the index of the rest that is being removed
*   note_info
*     a struct, described in structs.js, with information about the note being
*     inserted
* returns
*   none
*/
live_score.Measure.prototype.remove_rest_and_insert_note = function(
  current_position,note_to_split_index,note_info){
  
  var note_to_split = this.remove_rest(note_to_split_index);
  var end_of_rest = current_position + live_score.note_length_to_ticks(
    note_to_split.length);
  this.insert_rests_after_note(end_of_rest,note_to_split_index,note_info);
  this.insert_new_note(note_to_split_index,note_info);
};

/**
* split_rest_and_insert_note
*   handles the insert case where a note is placed in the middle of a rest
* args
*   current_position
*     the end position of the rest being split
*   note_to_split_index
*     the index of the rest that is being split
*   note_info
*     a struct, described in structs.js, with information about the note being
*     inserted
* returns
*   none
*/
live_score.Measure.prototype.split_rest_and_insert_note = function(
  current_position,note_to_split_index,note_info){
  
  var note_to_split = this.remove_rest(note_to_split_index);
  this.insert_rests_after_note(current_position,note_to_split_index,note_info);
  this.insert_new_note(note_to_split_index,note_info);
  this.insert_rests_before_note(current_position,note_to_split_index,note_to_split,
    note_info); 
};

/**
* remove_rest
*   removes a rest at a given position
* args
*   rest_index
*     the index of the rest that is being removed
* returns
*   rest_to_remove
*     the rest that has been removed 
*/
live_score.Measure.prototype.remove_rest = function(rest_index){
  var rest_to_remove = this.notes[rest_index];
  this.notes.splice(rest_index,1);
  return rest_to_remove;
};

/**
* insert_rests_before_note
*   in the case where an inserted note splits a rest, determine how to fill
*   the empty space before the note
* args
*   current_position
*     the end position of the rest being split
*   note_to_split_index
*     the index of the rest that is being split
*   note_to_split
*     the rest that is being split
*   note_info
*     a struct, described in structs.js, with information about the note being
*     inserted
* returns
*   none
*/
live_score.Measure.prototype.insert_rests_before_note = function(
  current_position,note_to_split_index,note_to_split,note_info){
  
  var start_position = current_position - live_score.note_length_to_ticks(
    note_to_split.length);
  var end_position = note_info.quantized_tick_position; 

  var rests = this.fill_space_with_rests(start_position,
    end_position);
  for(var i = rests.length - 1; i >= 0; i--){
    this.notes.splice(note_to_split_index,0,rests[i]);
  }
};

/**
* insert_rests_after_note
*   in the case where an inserted note splits a rest, determine how to fill
*   the empty space after the note
* args
*   current_position
*     the end position of the rest being split
*   note_to_split_index
*     the index of the rest that is being split
*   note_info
*     a struct, described in structs.js, with information about the note being
*     inserted
* returns
*   none
*/
live_score.Measure.prototype.insert_rests_after_note = function(
  current_position,note_to_split_index,note_info){
 
  var start_position = note_info.quantized_tick_position + 
    live_score.note_length_to_ticks(note_info.note_length);
  var end_position = current_position;
  
  var rests = this.fill_space_with_rests(start_position,
    end_position);
  for(var i = rests.length - 1; i >= 0; i--){
    this.notes.splice(note_to_split_index,0,rests[i]);
  }
};

/**
* insert_new_note
*   insert a new note into the measure
* args
*   note_to_split_index
*     the index where the note is being inserted
*   note_info
*     a struct, described in structs.js, with information about the note being
*     inserted
* returns
*   none
*/
live_score.Measure.prototype.insert_new_note = function(note_to_split_index,
  note_info){

  var pitch = live_score.translate_midi_number_to_pitch(note_info.pitch);
  var new_note = new live_score.Note(pitch, note_info.note_length,
    live_score.note_type);
  this.notes.splice(note_to_split_index,0,new_note);
};

/**
* remove_note_from_measure
*   removes a note from the measure
* args
*   note_info
*     a struct (see structs.js) that contiains information about the
*     note being removed
* returns
*   none
*/
live_score.Measure.prototype.remove_note_from_measure = function(note_info){
  var note_position = note_info.quantized_tick_position;
  var current_position = 0;
  var note_removed = false;
  var empty_note;
  for(var i = 0; i <= this.notes.length && !note_removed; i++){
    if(current_position === note_position && this.notes[i].is_note()){
      empty_note = this.notes[i].remove_note(note_info);
      note_removed = true;
    }else{
      var note_length = this.notes[i].length;
      var tick_length = live_score.note_length_to_ticks(note_length);
      current_position += tick_length;
    }
  }
  if(empty_note){
    var note_index = i-1;
    this.notes[note_index].make_rest();
  }
};

module.exports = live_score.Measure;
