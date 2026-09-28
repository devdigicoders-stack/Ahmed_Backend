import readline from 'readline';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Admin from './models/Admin.js';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('========================================================');
  console.log('   Ahmed for Facility Services - MongoDB Admin Creator');
  console.log('========================================================\n');

  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ MONGO_URI missing from .env file.');
      rl.close();
      return;
    }

    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB successfully.\n');

    let name = await question('Enter Admin Full Name: ');
    if (!name.trim()) {
      console.log('❌ Error: Admin name cannot be empty.');
      rl.close();
      await mongoose.disconnect();
      return;
    }

    let email = await question('Enter Admin Email Address: ');
    if (!email.trim() || !email.includes('@')) {
      console.log('❌ Error: Please provide a valid email address.');
      rl.close();
      await mongoose.disconnect();
      return;
    }

    let password = await question('Enter Admin Password (min 6 chars): ');
    if (!password.trim() || password.length < 6) {
      console.log('❌ Error: Password must be at least 6 characters long.');
      rl.close();
      await mongoose.disconnect();
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password.trim(), salt);

    const existingAdmin = await Admin.findOne({ email: email.trim().toLowerCase() });

    if (existingAdmin) {
      existingAdmin.name = name.trim();
      existingAdmin.password = hashedPassword;
      await existingAdmin.save();
      console.log(`\n🔄 Updated existing admin account for: ${email.trim()}`);
    } else {
      const newAdmin = new Admin({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: 'superadmin'
      });
      await newAdmin.save();
      console.log(`\n✨ Created new admin account for: ${email.trim()}`);
    }

    console.log('\n========================================================');
    console.log('✅ Admin Account Configured in MongoDB Atlas Successfully!');
    console.log(`   👤 Name:     ${name.trim()}`);
    console.log(`   📧 Email:    ${email.trim()}`);
    console.log('========================================================\n');

  } catch (error) {
    console.error('\n❌ Failed to create admin:', error.message);
  } finally {
    rl.close();
    await mongoose.disconnect();
  }
}

main();
