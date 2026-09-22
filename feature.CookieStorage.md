# Cookie Storage

We want to replace internal storage as a way to store the authentication tokens obtainer from both, refreshing and authenticating procedures.

## Technical Requirements

Alkachof UI will no longer support any type of simple storage using local storage to save JWT tokens for authentication purposes.
Implement a basic cookie system to save JWT to completely replace the local storage used to save authentication tokens
Mechanism should be transparent, fundamentals of procedures to authwnticate an user should not change.