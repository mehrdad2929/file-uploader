const prisma = require('./db/prisma');
//TODO: lets test some here before going to controller
async function main() {
    const users = await prisma.user.createMany({
        data: [
            {
                username: 'naghi69',
                password: 'naghis_hashed_password',
                email: 'naghi@mamoli.com',
                name: 'naghi mamoli'
            },
            {
                username: 'afsharMETAL',
                password: 'ali_afshar_hashed_pass',
                email: 'ali@afshar.com',
                name: 'ali afshar'
            },
            {
                username: 'khardool',
                password: 'amir_hossein_jedi_hashed_pass',
                email: 'amir@hossein.com',
                name: 'amir hossein'
            },
            {
                username: 'alucard',
                password: 'alucard_hashed_password',
                email: 'alucard@hellsing.com',
                name: 'bird of hermes'
            },
        ],
        skipDuplicates: true
    });
    console.log('created user:', users);
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
