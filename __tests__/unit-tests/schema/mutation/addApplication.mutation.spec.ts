describe('addApplication Resolver', () => {
  describe('Authentication and Authorization', () => {
    it('should throw an error if the user is not authenticated', async () => {
      // Test implementation
    });

    it('should throw an error if the user is not authorized to create application', async () => {
      // Test implementation
    });
  });

  describe('Application Naming Logic', () => {
    it("should set application name to 'Untitled application 0' if no existing applications found", async () => {
      // Test implementation
    });

    it('should generate unique name for new application based on highest existing application number', async () => {
      // Test implementation
    });
  });

  describe('Application Creation', () => {
    it('should create new application with correct default properties', async () => {
      // Test implementation
    });

    it('should set permissions correctly if user has limited access', async () => {
      // Test implementation
    });
  });

  describe('Notification Logic', () => {
    it('should create and save notification after application creation', async () => {
      // Test implementation
    });

    it('should publish notification to appropriate channel', async () => {
      // Test implementation
    });
  });

  describe('Channel and Role Creation', () => {
    it('should create main channel for the new application', async () => {
      // Test implementation
    });

    it('should create default roles and associate them with the new application', async () => {
      // Test implementation
    });
  });

  describe('Error Handling', () => {
    it('should log error and throw GraphQLError if an error occurs during creation process', async () => {
      // Test implementation
    });

    it('should return translated error message if a GraphQLError is thrown', async () => {
      // Test implementation
    });
  });
});
