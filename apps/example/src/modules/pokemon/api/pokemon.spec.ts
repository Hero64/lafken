import { executeLambda } from '@lafken/common';
import { describe, expect, it } from 'vitest';
import { PokeApi } from './pokemon.api';

describe('Pokemon api', () => {
  describe('what-is-this', () => {
    it('should return string value', async () => {
      const response = await executeLambda(PokeApi, {
        method: 'whatIsThisPokemon',
        params: [
          {
            name: 'Pikachu',
          },
        ],
      });

      expect(response).toBe("It's Pikachu!!!");
    });
  });
});
