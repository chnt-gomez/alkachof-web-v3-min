import '@testing-library/jest-dom'

// jsdom does not implement the object-url APIs used for local image previews.
if (!URL.createObjectURL) {
  URL.createObjectURL = () => 'blob:mock-preview'
  URL.revokeObjectURL = () => {}
}
