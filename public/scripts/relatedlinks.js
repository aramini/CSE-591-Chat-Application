/**
 * This file provided by Facebook is for non-commercial testing and evaluation
 * purposes only. Facebook reserves all rights not expressly granted.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * FACEBOOK BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
var Draggable = ReactDraggable;
var Upvote = React.createClass({
  handleUpvote:function(e){
    console.log(e.target);
    this.props.addUpvote(e.target);
  },
  render: function(){
    return(
    <span className="glyphicon glyphicon-menu-up pull-right" onClick={this.handleUpvote} aria-hidden="true"></span>
    );
  }
});

var Comment = React.createClass({
  addUpvote:function(data){
    console.log(data);
    console.log($(data).parent().toggleClass("vote"));
  },
  rawMarkup: function() {
    var rawMarkup = marked(this.props.children.toString(), {sanitize: true});
    return { __html: rawMarkup };
  },

  render: function() {
    return (
      <div className="comment list-group-item ">
        <div className="">
         <h4 className="commentAuthor list-group-item-heading" style={{display:'inline'}}> 

          <a href={this.props.url} target="_blank">{this.props.title}</a>
          
        </h4>
        <Upvote addUpvote={this.addUpvote}/>
       </div>
      </div>
    );
  }
});

var CommentBox = React.createClass({
  loadCommentsFromServer: function() {
    console.log("this is called");
    $.ajax({
      url: this.props.url,
      dataType: 'json',
      type:'GET',
      cache: false,
      success: function(data) {
        this.setState({data: data});
      }.bind(this),
      error: function(xhr, status, err) {
        console.error(this.props.url, status, err.toString());
      }.bind(this)
    });
  },
  handleCommentSubmit: function(comment) {
    console.log("WHY IS THIS CALLED");

    var comments = this.state.data;
    // Optimistically set an id on the new comment. It will be replaced by an
    // id generated by the server. In a production application you would likely
    // not use Date.now() for this and would have a more robust system in place.
    comment.id = Date.now();
    var newComments = comments.concat([comment]);
    this.setState({data: newComments});
    $.ajax({
      url: this.props.url,
      dataType: 'json',
      type: 'POST',
      data: comment,
      success: function(data) {
        console.log("GOT NEW DATA");
        this.setState({data: data});
      }.bind(this),
      error: function(xhr, status, err) {
        this.setState({data: comments});
        console.error(this.props.url, status, err.toString());
      }.bind(this)
    });

    $.ajax({
                type: "GET",
                url: "api/points?user="+sessionStorage.getItem("user"),
                success: function(msg) {}
            });
    $.ajax({
                type: "GET",
                url: "api/getpoints?user="+name,
                success: function(msg) {
                    $("#point-label").text(msg);
                }
            });
  },
  getInitialState: function() {
    return {data: []};
  },
  componentDidMount: function() {
    this.loadCommentsFromServer();
    setInterval(this.loadCommentsFromServer, this.props.pollInterval);
  },
  render: function() {
    var drags = {onStart: this.onStart, onStop: this.onStop};
    return (
      <Draggable  className="" handle="strong" >
        <div style={{position: 'absolute', top: '50px', right: '50px' }} className="commentBox container box no-cursor col-lg-4 col-md-5">
            <strong className="cursor">Drag here</strong>
            <h2>Comments</h2>

        <CommentList data={this.state.data} />
        <CommentForm onCommentSubmit={this.handleCommentSubmit} />
      </div>
      </Draggable>
    );
  }
});

var CommentList = React.createClass({
  render: function() {
    var commentNodes = this.props.data.map(function(comment) {
      return (
        <Comment title={comment.title} url={comment.url} key={comment.id}>

        </Comment>
      );
    });
    return (
      <div className="commentList" style={{height:'400px', 'overflow-y':'auto'}}>
      <div className="list-group">
        {commentNodes}
        </div>
      </div>
    );
  }
});

var CommentForm = React.createClass({
  getInitialState: function() {
    return {title: '', url:''};
  },
  handleURLChange: function(e){
    var desc = "";
    var title = "";
    this.setState({url:e.target.value});
  //   $.ajax({
  //    url: e.target.value,
  //    xhrFields: {
  //       withCredentials: false
  //     },
  //     crossOrigin:true,
  //     crossDomain: true,
  //    contentType: 'text/plain',
  //    type: 'GET',
  //    success: function ( code )
  //    {
  //      console.log(code);
  //     //   desc = $(code).filter(function(){ return $(this).is("meta[name=description]")});
  //     //   title = $(code).filter(function(){ return $(this).is("title")});
  //     //  console.log(desc.attr('content'));
  //     //  console.log(title.text());
  //     //  this.setState({author: JSON.stringify(title.text())});
  //     //  this.setState({text: JSON.stringify(desc.attr('content'))});
  //    }.bind(this)
  // });
},
  handleAuthorChange: function(e) {
    this.setState({title:e.target.value});
  },

  handleSubmit: function(e) {
    e.preventDefault();
    var title = this.state.title.trim(); 
    var url = this.state.url.trim();
    if (!url || !title) {
      return;
    }
    /**if(sessionStorage.getItem("user").match(/^(.(?!Expert))*$)/)){
      $(".alert").removeClass("in").show();
      $(".alert").delay(1000).addClass("in").fadeOut(10000);**/
   
    this.props.onCommentSubmit({url: url, title: title});
    this.setState({url: '', title: ''});
  },
  render: function() {
    return (
      <div className="well">
      <form className="commentForm" >
      <div className="form-group">
      <input
        className="form-control"
        type="text"
        placeholder="URL"
        value={this.state.url}
        onChange={this.handleURLChange}
      />
        </div>
      <div className="form-group">
        <input
          type="text"
          className="form-control"
          placeholder="Your name"
          value={this.state.title}
          onChange={this.handleAuthorChange}
        />
          </div>

        <div className="form-group">
        <button type="button" onClick={this.handleSubmit} className="saveComment btn btn-primary" >Save</button>
        </div>
      </form>
      </div>
    );
  }
});


ReactDOM.render(
  <CommentBox url="/api/comments" pollInterval={2000} />,
  document.getElementById('commentsContent')
);
