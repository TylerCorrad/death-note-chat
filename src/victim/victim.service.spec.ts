import { Test, TestingModule } from '@nestjs/testing';
import { VictimService } from './victim.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Victim } from './entities/victim.entity';
import { VictimImage } from './entities/victim-image.entity';
import { Repository, UpdateDescription } from 'typeorm';
import { CreateVictimDto } from './dto/create-victim.dto';
import { UpdateDeathTypeDto } from './dto/update-death-type.dto';
import { UpdateDetailsDto } from './dto/update-death-details.dto';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';


const victimArray = [
  {
    id: 'uuid-1',
    name: 'JOHN',
    lastName: 'DOE',
    isAlive: true,
    createdAt: new Date(),
    EditedAt: null,
    deathType: 'paro cardiaco',
    images: [],
  },
];


describe('VictimService', () => {
  let service: VictimService;
  let victimRepository: Repository<Victim>;
  let victimImageRepository: Repository<VictimImage>;

  const victimMock = {
    id: 'uuid-1',
    name: 'John',
    lastName: 'Doe',
    deathType: 'asesinato',
    details: null,
    isAlive: true,
    createdAt: new Date(),
    EditedAt: null,
    images: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VictimService,
        {
          provide: getRepositoryToken(Victim),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOneBy: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              getOne: jest.fn(),
              delete: jest.fn().mockReturnThis(),
              execute: jest.fn(),
            })),
            preload: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(VictimImage),
          useValue: {
            create: jest.fn(),
          },
        },
      ],
    }).compile();
  
    service = module.get<VictimService>(VictimService);
    victimRepository = module.get<Repository<Victim>>(getRepositoryToken(Victim));
    victimImageRepository = module.get<Repository<VictimImage>>(getRepositoryToken(VictimImage));
  });
  
  it('deberia estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('deberia crear una nueva victima', async () => {
      const dto: CreateVictimDto = {
        name: 'John',
        lastName: 'Doe',
        images: ['/static/products/00db3e43-abb2-42b8-a80d-12cdc6b1a3ea.jpeg'],
      };
  
      
      const created = { 
        ...dto, 
        id: 'uuid', 
        images: [{ 
          url: dto.images[0], 
          victim: {
            id: 'uuid',
            name: 'John',
            lastName: 'Doe',
            deathType: 'paro cardiaco',  
            details: null,  
            isAlive: false, 
            createdAt: new Date(),
            EditedAt: null,
            images: [],  
            checkFullNameInsert: jest.fn()
          }
        }]
      };
  
      
      jest.spyOn(victimImageRepository, 'create').mockReturnValue({
        url: dto.images[0],
        victim: {
          id: 'uuid',
          name: 'John',
          lastName: 'Doe',
          deathType: 'paro cardiaco',
          details: null,
          isAlive: true,
          createdAt: new Date(),
          EditedAt: null,
          images: [], 
          checkFullNameInsert: jest.fn()
        },
        id: 0
      });
  
      // Simulando la creación y guardado de la víctima
      jest.spyOn(victimRepository, 'create').mockReturnValue(created as any);
      jest.spyOn(victimRepository, 'save').mockResolvedValue(created as any);
  
      // Ejecutar el método
      const result = await service.create(dto);
  
      // Aseguramos que el resultado sea el esperado
      expect(result).toEqual({ 
        ...created, 
        images: dto.images  
      });
    });
  });
    
  
  describe('findAll', () => {
    it('deberia devolver todaas las victimas y sus imagenes', async () => {
      const fakeVictims = [{ ...victimArray[0], images: [{ url: 'img1.jpg' }] }];
      jest.spyOn(victimRepository, 'find').mockResolvedValue(fakeVictims as any);

      const result = await service.findAll({ limit: 10, offset: 0 });
      expect(result[0].images).toEqual(['img1.jpg']);
    });
  });

  describe('findOnePlain', () => {
    it('deberia devolver una victima', async () => {
      const victim = { ...victimArray[0], images: [{ url: 'img.jpg' }] };
      jest.spyOn(service, 'findOne').mockResolvedValue(victim as any);

      const result = await service.findOnePlain('uuid-1');
      expect(result.images).toEqual(['img.jpg']);
    });
  });

  describe('updateDeathType', () => {
    it('deberia actualizar el deathType y devolver la victima', async () => {
      const updateDto: UpdateDeathTypeDto = { deathType: 'suicidio' };
      const updated = { ...victimArray[0], ...updateDto };

      jest.spyOn(victimRepository, 'preload').mockResolvedValue(updated as any);
      jest.spyOn(victimRepository, 'save').mockResolvedValue(updated as any);
      jest.spyOn(service, 'findOnePlain').mockResolvedValue(updated as any);

      const result = await service.updateDeathType('uuid-1', updateDto);
      expect(result.deathType).toBe('suicidio');
    });

    it('deberia lanzar NotFound si la victima no existe', async () => {
      jest.spyOn(victimRepository, 'preload').mockResolvedValue(null);
      await expect(service.updateDeathType('bad-id', { deathType: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deberia eliminar una victima', async () => {
      const victim = victimArray[0];
      jest.spyOn(service, 'findOne').mockResolvedValue(victim as any);
      jest.spyOn(victimRepository, 'remove').mockResolvedValue(victim as any);

      await expect(service.remove('uuid-1')).resolves.toBeUndefined();
    });
  });

  describe('deleteAllVictims', () => {
    it('deberia eliminar todas las victimas', async () => {
      const deleteMock = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 }),
      };
      jest.spyOn(victimRepository, 'createQueryBuilder').mockReturnValue(deleteMock as any);

      const result = await service.deleteAllVictims();
      expect(result).toEqual({ affected: 5 });
    });
  });
});

describe('VictimService - Cron Job', () => {
    let service: VictimService;
    let victimRepo: Repository<Victim>;
  
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          VictimService,
          {
            provide: getRepositoryToken(Victim),
            useValue: {
              find: jest.fn(),
              update: jest.fn(),
            },
          },
          {
            provide: getRepositoryToken(VictimImage),
            useValue: {},
          },
        ],
      }).compile();
  
      service = module.get<VictimService>(VictimService);
      victimRepo = module.get<Repository<Victim>>(getRepositoryToken(Victim));
    });

    it('no debería marcar como muerta a la víctima sin foto después de 40s', async () => {
        const mockVictim = {
          id: 'uuid-2',
          name: 'Jane',
          lastName: 'Doe',
          deathType: 'Heart Attack',
          details: null,
          isAlive: true,
          createdAt: new Date(Date.now() - 50_000), // hace 50 segundos
          EditedAt: null,
          images: [], // sin imagen
        };
      
        jest.spyOn(service, 'findAll').mockResolvedValueOnce([mockVictim]);
      
        const updateSpy = jest.spyOn(victimRepo, 'update').mockResolvedValue({} as any);
      
        await service.findAllCron();
      
    
        expect(updateSpy).not.toHaveBeenCalled();
      });
      
      
  
    it('debería marcar como muerta a la víctima por ataque al corazón después de 40s', async () => {
        const mockVictim = {
            id: 'uuid-1',
            name: 'John',
            lastName: 'Doe',
            deathType: 'Heart Attack',
            details: null,
            isAlive: true,
            createdAt: new Date(Date.now() - 41 * 1000), // hace 41 segundos
            EditedAt: null,
            images: [{ url: 'death-note-chat/static/products/00db3e43-abb2-42b8-a80d-12cdc6b1a3ea.jpeg' }],
          };
  
      jest.spyOn(service, 'findAll').mockResolvedValue([{
        ...mockVictim,
        images: mockVictim.images.map(img => img.url), // para map de findAll()
      }]);
  
      const updateSpy = jest.spyOn(victimRepo, 'update').mockResolvedValue({} as any);
  
      await service.findAllCron();
  
      expect(updateSpy).toHaveBeenCalledWith(
        'uuid-1',
        expect.objectContaining({
          isAlive: false,
        })
      );      
    });
  });
