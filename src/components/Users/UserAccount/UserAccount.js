import React, { useState } from 'react';
import { connect } from 'react-redux';
import PasswordValidator from '../Validators/PasswordValidator/PasswordValidator';
import * as firebase from '../../../fireConfig';

import * as action from '../../../store/actions'

import EmailValidator from '../Validators/EmailValidator/EmailValidator';
import Modal from '../../UI/Modal/Modal';

import reAuthHelper from './reAuthHelper';

const userAccount = props => {

	const user = firebase.auth.currentUser;
	// EmailAuthProvider is from firebase/app ( poor documentation on this )

	const [ emailAddress, setEmailAddress ] = useState('');
	const [ needReLogin, setNeedReLogin ] = useState(false);
	// confirm delete account
	const [ delAccount, setDelAccount ] = useState(false);
	const [ delAccountModal, setDelAccountModal ] = useState(false);

    const signOutHandler = () => {
        firebase.auth.signOut().then(() => {
            // Sign-out successful.
          }).catch(error => {
            // An error happened.
          });
	}	

    const updateEmailHandler = () => {
		if (props.authEmail.validity) {	
			user.updateEmail(props.authEmail.current).then(() => {
				console.log('EMAIL UPDATED!!!!')
				props.onResetEmail();

				setEmailAddress(props.authEmail.current)
			}).catch(function(error) {
				// Using reAuthHelper to clean up code
				// Decided on this for now instead of a generic error handler becaues of specific cases
				const reAuth = reAuthHelper(error.code, error.message)
				setNeedReLogin(reAuth.setNeedReLogin)
				props.onFail(reAuth.error.value, reAuth.error.code, reAuth.error.message)
			});
		} else {
			setNeedReLogin(false);
			props.onFail(true, 'invalid email', 'please use a valid email address')
		}
	}
	
	const reAuthenticateHandler = () => {

		const credential = firebase.fb.auth.EmailAuthProvider.credential(user.email, props.authPassword.current);
		console.log(credential)
		user.reauthenticateAndRetrieveDataWithCredential(credential).then(function() {
			// User re-authenticated.
			console.log('RE AUTHENTICATED!!!!')
			setDelAccountModal(false);
			props.onFailDismiss();
			props.onResetPassword();
			updateEmailHandler();

		}).catch(function(error) {
			// An error happened.
			console.log(error);
		});
		setNeedReLogin(false);
	}

	const closeModalHandler = () => {
		setDelAccountModal(false);
	}

	const deleteUserHandler = () => {
		// "ARE YOU SURE YOU WANT TO DELETE YOUR ACCOUNT!?"
		// opens special modal with delete account confirm button
		// If error is returned for needs re-auth on account, auto re-opens new modal with re-auth functionality
		// TODO: 
		// Need a method to determine why I am re-authenticating, so that I can show the correct message after.
		if (delAccount === false){
			setDelAccountModal(true);
		}
	}

	const confirmDeleteUserHandler = () => {
		setDelAccount(true);
		setDelAccountModal(false);

			user.delete().then(function() {
				// User deleted.
			}).catch(function(error) {
				// Using reAuthHelper to clean up code

				// if needs re-auth error code returns, changes state for setNeedReLogin and opens new modal
				const reAuth = reAuthHelper(error.code, error.message)
				setNeedReLogin(reAuth.setNeedReLogin)
				props.onFail(reAuth.error.value, reAuth.error.code, reAuth.error.message)
			});
	}


	let markup;
	if ( needReLogin === true ) {
		// if re-login is needed, we show the passwordValidator
		markup = (
			<Modal show={props.authFail.isFail} deactive={props.onFailDismiss}>
                <p>{props.authFail.errorMessage}</p>
				<PasswordValidator />
				<button onClick={reAuthenticateHandler}>RE AUTH</button>
        	</Modal>
		)
	} else if ( needReLogin === false ) {
		markup = (
			<Modal show={props.authFail.isFail} deactive={props.onFailDismiss}>
                <p>{props.authFail.errorMessage}</p>
        	</Modal>
		)
	}
	
	// Delete user account
	if ( delAccountModal === true ) {
		markup = (
			<Modal show={delAccountModal} deactive={closeModalHandler}>
                <p>Are you sure that you want to delete your account?</p>
				<button onClick={confirmDeleteUserHandler}>YES DELETE IT</button>
        	</Modal>
		)
	}

	let uid;
    if (user != null) {
		if (user.email !== emailAddress) {
			setEmailAddress(user.email)
		}
      uid = user.uid; 
	}
	
    return (
        <>
        <p>{emailAddress}</p>
        <p>{uid}</p>
        <button onClick={signOutHandler}>LOGOUT</button><br />
        <button onClick={deleteUserHandler}>DELETE ACCOUNT!</button>
        <EmailValidator label="UPDATE YOUR EMAIL ADDRESS" />
        <button onClick={updateEmailHandler}>Update Email</button>

		{markup}
        </>
    )
}

const mapStateToProps = state => {
  return {
    authFail: state.user.authFail,
    authPassword: state.user.password,
    authEmail: state.user.email,
  }
}

const mapDispatchToProps = dispatch => {
  return {
    onFail: (isFail, code, message) => dispatch(action.authFail(isFail, code, message)),
	onFailDismiss: () => dispatch(action.authFail(false)),
	// we just fire these off based on event to reset the password and email to empty
	onResetPassword: () => dispatch(action.authValidation('password', '', false)),
	onResetEmail: () => dispatch(action.authValidation('email', '', false))
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(userAccount);