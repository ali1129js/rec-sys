/**
 * @Author: Ali
 * @Date:   2019-03-06T13:30:01+01:00
 * @Last modified by:   Ali
 * @Last modified time: 2019-03-17T12:24:27+01:00
 */
import React, { Component } from "react";

class Users extends Component {
  constructor(props) {
    super(props);
    this.state = { inputValue: "" };
  }
  componentDidMount() {
    const usersMovies = this.props.users.map(user => user.movies);
    const userData = usersMovies.map(user => user);
    this.setState({ userData });
  }
  handleChange = e => {
    this.setState(
      {
        inputValue: e.target.value
      },
      this.props.handleChange(e.target.value)
    );
  };

  render() {
    const { movieName } = this.props;
    //console.log(Object.entries(movies));
    return (
      <div>
        <form>
          <input
            type="text"
            value={this.state.inputValue}
            onChange={this.handleChange}
          />
        </form>
        <strong> {movieName} </strong>
      </div>
    );
  }
}
export default Users;
