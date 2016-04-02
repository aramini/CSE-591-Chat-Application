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
var Archive = React.createClass({
  render:function(){
    var a = this.props.title;
    console.log(a);
    var url = '/archive?title='+a+'&date='+this.props.created;
    console.log(url);
    return (
      <tr>
            <td>{this.props.created}</td>
            <td>{this.props.title}</td>
            <td>{this.props.summary}</td>
            <td><a href={url}>Show Chat</a></td>
      </tr>

      )
  }
});
var Comment = React.createClass({
  rawMarkup: function() {
    var rawMarkup = marked(this.props.children, {sanitize: true});
    return { __html: rawMarkup };
  },

  render: function() {
    return (
      <div className="comment" >
        <div style={{padding:'9',margin:'2'}}>
          <h4 style={{display:'inline'}} className="commentAuthor text-primary">
            {this.props.author} {this.props.name}: 
           </h4>
           <h4 style={{display:'inline'}} className="text-muted"> 
            &nbsp;{this.props.children}
          </h4>
        </div>
      </div>
    );
  }
});


var ArchiveBox = React.createClass({

 
  render: function(){
    return(
      <div>
        <ArchiveList archives={this.props.archives} />
      </div>
      )
  }
});


var CommentBox = React.createClass({

  handleCommentSubmit: function(comment) {
    this.props.handleCommentSubmit(comment)
  },
  render: function() {
    return (

      <div className="commentBox container">
        <h1 className="text-primary">Comments</h1>
        <CommentList data={this.props.data} />
        <CommentForm onCommentSubmit={this.handleCommentSubmit} />
      </div>
    );
  }
});

var ArchiveList = React.createClass({
  render:function(){
    var archiveNode = this.props.archives.map(function(archive){
      return(
        <Archive summary={archive.summary} title={archive.title} created={archive.created} tags={archive.tags} key={archive._id}/>
        )
    })
    return(
      <div className="archiveNodes">
      <table className="table table-striped">
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Summary</th>
                <th>Chat Archive</th>
              </tr>
            </thead>
            <tbody>
               {archiveNode}
            </tbody>
      </table>
      </div>
      )
  }
});

var CommentList = React.createClass({
  render: function() {
    var commentNodes = this.props.data.map(function(comment) {
      return (
        <Comment author={comment.author} key={comment.id} name={comment.user}>
          {comment.text}
        </Comment>
      );
    });
    return (
      <div className="commentList" style={{paddingBottom:"20"}}>
        {commentNodes}
      </div>
    );
  }
});

var CommentForm = React.createClass({
  getInitialState: function() {
    return {author: '', text: '',user:localStorage.getItem("user")};
  },
  /**handleAuthorChange: function(e) {
    this.setState({author: e.target.value});
  },**/
  handleTextChange: function(e) {
    this.setState({text: e.target.value});
  },
  handleSubmit: function(e) {
    e.preventDefault();
    //var author = this.state.author.trim();
    var text = this.state.text.trim();
    console.log(text +"   "+localStorage.getItem("user"));
    this.props.onCommentSubmit({text: text,user: localStorage.getItem("user")});
  this.setState({text: '',user:''});
  },
  render: function() {
    return (
      <div className="container">
      <form className="commentForm form-horizontal" onSubmit={this.handleSubmit}>
      <div className="form-group">           
           <div className="col-sm-10">
           <input type="text" className="form-control" id="exampletext" 
              placeholder="Say something.."                            
              value={this.state.text}
              onChange={this.handleTextChange}
           />
           </div>
      </div>
        
        <div className="form-group">
            <div className="col-sm-10">
            <button type="submit" className="btn btn-default" value="Post">Post</button>
            </div>
        </div>        

      </form>
      </div>
    );
  }
});

var App = React.createClass({
  getInitialState: function() {
    return { archives: [],iarchives: [],archivecomments:[],iarchivecomments:[]};
  },
  filterList: function(event){
      var updatedList = this.state.iarchives;
      updatedList = updatedList.filter(function(item){
        console.log(item.title);
        return item.title.toLowerCase().includes(
          event.target.value.toLowerCase());
        });
        this.setState({archives: updatedList});


      var updatedList2 = this.state.iarchivecomments;
      updatedList2 = updatedList2.filter(function(item){
        console.log("-->"+item.text);
        return item.text.toLowerCase().includes(
          event.target.value.toLowerCase());
      });
      console.log(updatedList2);
      this.setState({archivecomments: updatedList2});
      },
  handleCommentSubmit: function(comment) {
    var comments = this.state.archivecomments;
    console.log(JSON.stringify(comment));
    // Optimistically set an id on the new comment. It will be replaced by an
    // id generated by the server. In a production application you would likely
    // not use Date.now() for this and would have a more robust system in place.
    comment.id = Date.now();
    var newComments = comments.concat([comment]);
    this.setState({archivecomments: newComments});
    this.setState({iarchivecomments: newComments});
    $.ajax({
      url: "/api/archivecomments",
      dataType: 'json',
      type: 'POST',
      data: comment,
      success: function(data) {
        this.setState({data: data});
      }.bind(this),
      error: function(xhr, status, err) {
        this.setState({archivecomments: comments});
        console.error(this.props.url, status, err.toString());
      }.bind(this)
    });
  },
  componentDidMount: function(){
    $.ajax({
      url: "/api/archiveslist",
      dataType: 'json',
      cache: false,
      success: function(data) {
        console.log(data);
        this.setState({archives: data});
        this.setState({iarchives: data});
      }.bind(this),
      error: function(xhr, status, err) {
        console.error(this.props.url, status, err.toString());
      }.bind(this)
    });

    $.ajax({
      url: "/api/archivecomments",
      dataType: 'json',
      cache: false,
      success: function(data) {
        this.setState({archivecomments: data});
        this.setState({iarchivecomments: data});
      }.bind(this),
      error: function(xhr, status, err) {
        console.error(this.props.url, status, err.toString());
      }.bind(this)
    });

  },
  render:function(){
    return (
    <div className="container">
      <div className="row">
      <div className="col-sm-8">
          <h2>Archives List</h2>
      </div>
      <div className="col-sm-4">
          <input type="text" className="form-control" placeholder="Search for..." onChange={this.filterList}/>
      </div>
      </div>
      <ArchiveBox archives={this.state.archives} filter={this.filterList}/>
      <CommentBox url="/api/archivecomments" filter={this.filterList} pollInterval={2000} handleCommentSubmit={this.handleCommentSubmit} data={this.state.archivecomments}/>
    </div>
    )
  }
});

ReactDOM.render(
  <App/>,
  document.getElementById('content')
);
